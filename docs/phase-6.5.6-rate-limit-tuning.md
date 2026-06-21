# Phase 6.5.6 — Tuning the behavioural rate limits against real traffic

The behavioural layer (query path **Q5** — see
[`architecture/02-guardrail-pipeline-layers.md`](architecture/02-guardrail-pipeline-layers.md))
shipped with **placeholder thresholds**. They are deliberate starting points, not
validated figures. This is the *process* for turning them into tuned figures once
the product has real users.

The shipped defaults (all overridable via `RATE_LIMIT_*` env vars — see
[`.env.example`](../.env.example)):

| Limit | Default | Env var |
|-------|---------|---------|
| Session velocity | 20 messages / 60 s per child | `RATE_LIMIT_MAX_MESSAGES`, `RATE_LIMIT_VELOCITY_WINDOW_S` |
| Repeated-probe | 4 probes / 300 s per child | `RATE_LIMIT_MAX_PROBES`, `RATE_LIMIT_PROBE_WINDOW_S` |
| Device reputation | 8 probes / 3600 s per device | `RATE_LIMIT_DEVICE_PROBE_STRIKES`, `RATE_LIMIT_REPUTATION_WINDOW_S` |
| PIN brute-force | 5 fails / 900 s per child | `RATE_LIMIT_MAX_PIN_FAILURES`, `RATE_LIMIT_PIN_WINDOW_S` |

A "probe" is any guardrail flag (`sensitive` / `blocked` / `validation-failed`);
child-initiated `reported` flags are excluded.

---

## Why this can only be tuned with real traffic

The right threshold sits in the gap between two distributions we don't yet know:

- **Legitimate use** — how fast does a genuinely chatty child send messages? How
  often does a curious-but-innocent child incidentally trip a guardrail?
- **Abuse** — the rapid, repeated probing pattern we're trying to catch.

Set the threshold too low and we throttle real children (false positives — the
worse failure for a child-safety product, because it degrades the safe-by-default
experience and trains kids to route around the product). Set it too high and
probing slips through (false negatives). Both distributions are empirical. There
is no paper figure for "messages per minute a real 8-year-old sends."

This layer is **medium-confidence by design**: it is a net that catches the
persistent adversary that single-message checks miss, not a primary guardrail.
Tuning errs toward **permissive** — let the deterministic layers (blocklist,
sensitive-topic redirect) carry the load, and treat a throttle as a coarse
backstop, not the first line of defence.

---

## The telemetry already exists

Every signal is recorded in the `behavioural_events` table — including
`rate_violation` rows written *when a throttle fires*. This means tuning is a
**retrospective query exercise, not a new instrumentation project**: you can ask
"would threshold X have fired on last week's traffic?" against logged `message` /
`probe` / `pin_fail` rows without changing what's enforced.

```
behavioural_events(id, child_id, device_token, kind, created_at)
  kind ∈ {message, probe, rate_violation, pin_fail}
```

> ⚠️ **Retention caveat.** To stay bounded, the chat write path prunes a
> child's/device's events older than `RATE_LIMIT_RETENTION_S` (default 24 h). That
> window is fine for *enforcement* but too short for *tuning*. **Before a tuning
> period, either raise `RATE_LIMIT_RETENTION_S` to cover the analysis window, or
> stream `behavioural_events` to a separate analytics store before pruning.**
> Without this, the lookback for the queries below is capped at the retention
> window.

---

## The tuning loop

```
1. Observe   → collect a baseline of legitimate traffic   → verify: distributions plotted
2. Diagnose  → find false positives & false negatives      → verify: each throttle classified
3. Adjust    → move one threshold via its env var          → verify: no redeploy needed
4. Re-observe → confirm the move did what you expected      → verify: FP/FN rate moved as intended
   (repeat)
```

It's a loop, not a one-shot — child behaviour shifts with age cohorts, term time,
and product changes (e.g. a new feature that legitimately increases message rate).
Re-run it after any change that could move the legitimate-use distribution.

### 1. Observe — baseline legitimate traffic

Run the product with limits **permissive** (or temporarily raised well above the
defaults) so almost nothing is throttled, and let real usage accumulate. Then plot
the per-child / per-device distributions you're about to threshold on.

Messages per child per minute (the velocity distribution):

```sql
-- bucket each child's messages into 1-minute windows, look at the busy end
SELECT child_id, date_trunc('minute', created_at) AS minute, count(*) AS msgs
FROM behavioural_events
WHERE kind = 'message'
GROUP BY child_id, minute
ORDER BY msgs DESC
LIMIT 50;
```

Probes per child per 5-minute window (the repeated-probe distribution):

```sql
SELECT child_id,
       to_timestamp(floor(extract(epoch FROM created_at) / 300) * 300) AS window_start,
       count(*) AS probes
FROM behavioural_events
WHERE kind = 'probe'
GROUP BY child_id, window_start
ORDER BY probes DESC
LIMIT 50;
```

The same shapes for `device_token` + `reputation` window, and `pin_fail` per child,
give the other three baselines.

### 2. Diagnose — classify what fired (and what should have)

Two questions, both answerable from the table:

- **False positives** — pull the `rate_violation` rows and inspect the child's
  surrounding `message`/`probe` history. Was this a real child caught mid-burst,
  or genuine probing? A cluster of FPs means the threshold is below normal use.

  ```sql
  SELECT child_id, count(*) AS throttles
  FROM behavioural_events
  WHERE kind = 'rate_violation'
  GROUP BY child_id
  ORDER BY throttles DESC;
  ```

- **False negatives** — cross-reference the `flags` table (the parent-visible
  guardrail record) against `rate_violation`: children who tripped many guardrails
  but were *never* throttled are the misses. If real probing slips through, the
  threshold is too high.

### 3. Adjust — one knob at a time

Set the threshold a margin **above the high percentile of legitimate traffic**
(e.g. p99 of the velocity distribution from step 1), not at the median. The aim is
to clear normal use comfortably and only catch the clearly-anomalous tail.

Per-limit guidance:

- **Velocity** — a child typing genuinely can't sustain a high message rate; a
  paste-script or bot can. Put the threshold above the p99 legitimate burst.
- **Repeated-probe** — most legitimate children produce **0** probes. A curious
  child might incidentally trip 1–2; that's the redirect-to-parent flow's job (Q4),
  not the throttle's. Keep this clearly above incidental tripping so curiosity
  isn't punished as abuse.
- **Device reputation** — a shared device (classroom, family tablet) legitimately
  accumulates more probes than any single child, so the device limit must be more
  lenient than `per-child limit × children on the device`. Tune off the per-device
  distribution, not by multiplying the per-child figure.
- **PIN brute-force** — least traffic-dependent (a 4-digit PIN is 10 000 combos;
  5 fails / 15 min is conventional). Tune mainly against legitimate fat-finger
  fails: if real users hit the lockout, loosen it.

Each is an env var, so a change is a config edit, **no redeploy**.

### 4. Re-observe

After a change, watch the FP rate (step 2) and the FN rate move in the expected
direction before touching the next knob. Change one threshold per iteration so the
effect is attributable.

---

## When are we "tuned enough"?

This layer never reaches zero error — that's the medium-confidence framing. Stop
iterating when:

- The **false-positive rate is near zero** on legitimate traffic (the priority —
  a throttled real child is the costlier error here), **and**
- Throttles correlate with genuinely anomalous sessions (cross-checked against the
  `flags` table), **and**
- The thresholds are documented with the date and the traffic volume they were
  derived from, so the next reviewer knows how stale they are.

---

## Known limitations to weigh while tuning

- **Probe-recording race.** A probe is recorded when the web app persists a flag,
  which happens *after* the streamed response. A child firing messages
  back-to-back can get message *n+1* in before message *n*'s probe is recorded, so
  per-window probe counts can slightly undercount a fast burst. Repeated probing
  over several turns still accumulates; a single-burst evasion is out of scope for
  this layer and is what the deterministic per-message layers are for.
- **Small-N early.** With few users, percentiles are noisy. Prefer permissive
  thresholds until there's enough traffic for the distributions to stabilise.
- **Identity is client-supplied.** `childId` / `deviceToken` come from the client
  session; a determined attacker can rotate them. This layer raises the cost of
  casual probing, not the floor against a sophisticated adversary.
