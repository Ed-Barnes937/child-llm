# Phase 6.5 — Guardrail Hardening (Gap Analysis & Plan)

**Goal:** make the safety product *solid* before any billing work begins. This phase
sits between Phase 6 (Parent Dashboard) and Phase 7 (Billing & Account Management).

This is the actionable companion to the research in
[`architecture/02-guardrail-pipeline-layers.md`](architecture/02-guardrail-pipeline-layers.md)
and the decision in [`decisions/03-guardrails-tech.md`](decisions/03-guardrails-tech.md).

---

## Why this phase exists

The two-pass guardrail research reached one structural conclusion: **most of the safety
load currently rests on a single fallible layer** — the gpt-4.1-nano LLM-as-judge (R5).
Simple, non-technical reframing (story framing, an apology, emoji) can flip its verdict,
and a bigger/more expensive judge does not reliably fix this.

The fix is not a better judge. It is to surround it with **cheap, attack-resistant,
decorrelated** layers so that two independent things must fail before anything reaches a
child.

The catch surfaced by mapping the research against the plan: **several of the most
safety-critical items are currently scheduled *after* billing** — a dedicated classifier
and red-teaming live in Phase 10, rate-limiting in Phase 9. Shipping billing on top of a
guardrail that's known to be the weak link is the wrong order. Phase 6.5 pulls that work
forward and consolidates it.

---

## Gap analysis

Layer codes (Q* = query path, R* = response path) refer to the pipeline-layers reference.

| Gap | Layer(s) | Research priority | Where it lives in the plan today |
|-----|----------|-------------------|----------------------------------|
| Text canonicalisation before any filter (in + out) | Q1, R1, Q2 | **P0** | Nowhere — net-new |
| Purpose-built safety classifier as 2nd opinion | R3 | **P0** | Deferred to **10.1** (after billing) |
| Non-LLM statistical 3rd opinion (fastText) | R4 | **P0** | Nowhere — net-new |
| Adversarial eval / known-trick test set | — | **P0** | Partial in **10.1** "red team" (after billing) |
| Scan the AI *response* for sensitive topics | R6 | P1 | ✅ **Shipped in PR #19 (#16)** |
| Whole-conversation (crescendo) check | Q5, R6 | P1 | Nowhere — net-new |
| Behavioural signals — rate / velocity / repeated-probe | Q5 | P1 | Partial in **9.5** (PIN brute-force only, after billing) |
| Prompt-injection shield on input | input | P1 | Nowhere — net-new |
| Dedicated grooming/CSAM path + human-in-the-loop | — | P1 / mandatory | Nowhere — net-new (UK: out of OSA user-to-user scope while text-only 1:1 — ADR-0007) |
| Safe-by-default presets + honest disclosure + parent visibility | parental | P2 | Partial across Phase 2 / Phase 6 |
| Hash PINs (stop storing plaintext) | — | security | ✅ **Shipped in PR #19 (#17, scrypt)** |
| Force password change on first login (default password = username) | — | security | New — surfaced by PR #19 |

**The pattern:** four of the gaps are genuinely net-new, three are scheduled too late
(10.1, 9.5), and two — the AI-response topic scan and the plaintext-PIN debt — are
**already shipped in PR #19**. None of the remaining work requires leaving OpenRouter or
training a model.

---

## Phase 6.5 work items

Ordered by leverage (safety bought per unit of effort). P0s are cheap and high-impact;
none mean abandoning the current setup. Each item states its success check.

### Tier P0 — close the cheapest bypasses first

- [ ] **6.5.1** Canonicalisation pre-filter (Q1, R1, Q2)
  - Normalise Unicode (NFKC), fold homoglyphs/confusables, strip zero-width chars,
    de-leet — on a **scan copy only**, never the stored message. Run it ahead of the
    blocklist on both the child input and the model output.
  - Tools already in scope: `confusables`, `glin-profanity` (MIT), existing `obscenity`.
  - **Verify:** trick-set messages using homoglyph/emoji/zero-width obfuscation are
    caught; stored messages are byte-for-byte unchanged; added latency < 1ms.

- [ ] **6.5.2** Second + third opinion classifiers (R3, R4)
  - **R3:** add a purpose-built safety classifier (Llama Guard via OpenRouter ≈ $0.18/M
    is lowest-effort; ShieldGemma/Detoxify are self-host alternatives) as a parallel vote
    alongside the existing judge. **Disagreement → treat as unsafe → fallback.**
  - **R4:** add a non-LLM classifier (fastText) as a decorrelated third vote.
  - See the cost table in the pipeline-layers reference. Note the sidecar implication for
    self-hosted options (the pipeline is Node/Hono with no Python today).
  - **Verify:** both classifiers run in the pipeline; a reply the judge passes but a
    classifier flags is blocked; end-to-end added latency measured and acceptable.

- [ ] **6.5.3** Adversarial eval harness (the trick set)
  - A fixed, version-controlled suite of known bypasses — story framing, apologies,
    emoji, crescendo build-ups — run on every prompt/model change, tracking bypass rate.
  - **Verify:** suite runs in CI; a regression (higher bypass rate) fails the build.
  - *Replaces the ad-hoc "red team the guardrails" intent of plan item 10.1 with a
    repeatable harness.*

### Tier P1 — close the structural gaps

- [x] **6.5.4** Output sensitive-topic scan (R6) — ✅ **shipped in PR #19 (#16)**
  - The pipeline now scans the AI response, not just the child's input, catching indirect
    probing where the child's phrasing is innocuous but the model introduces sensitive
    terms. Includes a multi-turn flag-persistence CT test.

- [ ] **6.5.5** Whole-conversation (crescendo) check (Q5, R6)
  - Evaluate the running conversation each turn, so a slow multi-step build-up is caught
    before the consecutive-sensitive-turn counter would notice it.
  - **Verify:** a staged crescendo in the trick set is flagged before the depth threshold.

- [ ] **6.5.6** Behavioural signals + rate limiting (Q5)
  - Rate / session-velocity limits, repeated-probe detection, basic device reputation —
    on Postgres + Hono middleware. **Pulls plan item 9.5 forward** and broadens it beyond
    PIN brute-force.
  - **Verify:** repeated rapid probing is throttled/flagged; thresholds tuned against real
    traffic, not a paper figure (this layer is medium-confidence — see the reference).

- [ ] **6.5.7** Prompt-injection shield on input
  - A dedicated detector at the input stage for "ignore your instructions and…" style
    overrides.
  - **Verify:** known injection strings in the trick set are caught pre-generation.

- [ ] **6.5.8** Grooming / CSAM escalation path + human-in-the-loop — *mandatory*
  - This category must **never** rest on the general judge. Route to dedicated detection,
    a clear reporting process, and a person in the loop.
  - **UK scope finding (2026-06-20, see ADR-0007).** A one-to-one, text-only child↔AI chat
    falls *outside* the Online Safety Act's user-to-user regime, so the **CSEA reporting
    duty (NCA CSEA-IRP, in effect 7 Apr 2026) does not bind the product as built** — that
    duty applies to user-to-user services only, but where it applies there is **no size or
    risk threshold**. Two roadmap features flip us into the full regime: (a) **any
    user-to-user feature** (children sharing conversations, group/community), and (b)
    **media upload** (pulls in the indecent-images criminal regime + IWF hash-matching +
    NCA reporting). Criminal law on CSAM applies regardless of OSA scope. *Not legal advice;
    don't self-certify — the parent-views-conversations feature is the one edge to confirm
    against the user-to-user test with counsel.*
  - **Verify (now — text-only 1:1 launch):** a documented manual escalation + safe-handling
    path exists, owned by a named person, not handed to an LLM; the OSA scope determination
    is recorded (ADR-0007) and lawyer-reviewed.
  - **Verify (gated — the day sharing OR media upload ships):** NCA CSEA-IRP reporting
    integration + IWF hash-list matching are in place *before* that feature reaches users;
    re-run the scope determination.

### Tier P2 — turn control into real control

- [ ] **6.5.9** Safe-by-default + honest disclosure + parent visibility
  - Ship the **strictest** preset as the default (not the middle one). Give parents a
    plain record of what was flagged / what got through, and an honest statement of what
    the system can't guarantee.
  - **Verify:** default preset on new-child creation is the most protective; a flag log is
    visible in the parent dashboard; disclosure copy is present.

- [x] **6.5.10** Hash PINs (security debt) — ✅ **shipped in PR #19 (#17)**
  - Child PINs and the child password are hashed with `node:crypto` scrypt (random salt +
    `timingSafeEqual`, zero new deps). Inputs are type-guarded and PIN format is enforced
    server-side. Carried over from **phase-6-tidy-up #7**.

- [ ] **6.5.11** Force child password change on first login
  - The child's default password is its username (`tempPassword = username`) — now hashed
    but still a weak default. Force a change on first login. Follow-up surfaced by PR #19.
  - **Verify:** a child created with the default cannot complete a session without setting
    a new password.

---

## What moves, and what stays

| Plan item | Change |
|-----------|--------|
| **10.1** Red-team + "evaluate adding LlamaGuard 4" | **Pulled forward** → becomes 6.5.2 (classifier, now decided) + 6.5.3 (repeatable harness). Phase 10 keeps only a final pre-launch regression run *using* the 6.5.3 harness. |
| **9.5** Rate limiting / brute-force on PIN | **Pulled forward & broadened** → 6.5.6. PIN-specific brute-force stays as the minimum within it. |
| **phase-6-tidy-up #7** Plaintext PINs | **Pulled in** → 6.5.10. |
| **Phase 2 / 6** preset defaults & parent dashboard | Unchanged, but 6.5.9 adds the safe-default + disclosure + flag-visibility requirements on top. |
| **Phase 7** Billing onward | **Unchanged — and gated.** Does not start until Phase 6.5 P0 + P1 items are done. |

---

## The gate

Billing (Phase 7) is the line in the sand. **Phase 6.5 Tier P0 and Tier P1 should be
complete before Phase 7 starts.** Tier P2 (safe defaults, disclosure) is strongly
recommended in the same window but is product/design work rather than a hard blocker.

The one-line rationale: a paywall on top of a guardrail that's known to be the weak link
is the wrong order. Make the core safe, then charge for it.
