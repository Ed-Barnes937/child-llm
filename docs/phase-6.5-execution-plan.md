# Phase 6.5 — Execution Plan (how to build it)

How the Phase 6.5 work items get built when development is **mostly hands-off**, driven by
parallel Claude sessions. This is the *delivery* companion to the *what/why* in
[`phase-6.5-guardrail-hardening.md`](phase-6.5-guardrail-hardening.md).

The grouping here is by **where the code lives and what depends on what** — not by the P0/P1/P2
tiers, which order by safety leverage rather than build order.

---

## The decision that dominates: build the oracle first

This is a child-safety product built mostly hands-off. What makes hands-off *safe* is an
**objective pass/fail gate**, not a smarter agent. So **6.5.3 (the adversarial eval harness)
is the zeroth item, not the third** — build it first, get it green in CI, and every
subsequent PR is judged against it.

Without the harness first, parallel agents produce *plausible* safety code with no shared
definition of "working" — which is the exact "LLM-validates-LLM" trap the whole architecture
exists to escape. The harness is the substrate; everything else builds on it.

---

## Three tracks

| Track | Items | Files touched | How to run it |
|-------|-------|---------------|---------------|
| **A · Foundation** (serial, first) | 6.5.3 harness → 6.5.1 canonicalisation | shared scan-path / CI | **One focused session, sequential.** Not parallelisable — everything builds on these. |
| **B · Validation cluster** (serial chain) | 6.5.2 classifiers → 6.5.7 injection shield → 6.5.5 crescendo | all edit the same validation / pipeline code | **One session as a PR chain** (merge upstream-into-downstream). Parallelising these = conflicts + unverifiable interactions. |
| **C · Independent infra** (true parallel) | 6.5.6 rate-limit middleware · 6.5.9 safe-default presets · 6.5.11 force password change · 6.5.8 CSAM docs · 6.5.12 UK-only access | different subsystems, no overlap | **Separate sessions in separate git worktrees**, each branched off `main`, each its own PR. This is where parallelism pays. |

**Why B must be serial:** 6.5.2, 6.5.5, and 6.5.7 all reach into the same validation flow.
Running them as parallel sessions buys merge conflicts and three agents who can't see each
other's changes to the thing they're all modifying. Chain them, each PR rebased on the prior
and verified against the 6.5.3 harness.

**Why C can be parallel:** rate-limit middleware, preset defaults, the auth flow, the CSAM
docs, and the UK-only edge/signup control touch disjoint parts of the codebase. Separate
worktrees won't collide on merge; each branches off `main` independently (no chain needed).

---

## Order of operations

1. **Solo session (Track A):** land 6.5.3, then 6.5.1. Harness green in CI before anything else starts.
2. **Fan out (Track C):** spin up the independent-infra worktrees (6.5.6 / 6.5.9 / 6.5.11 / 6.5.8). These run *while* step 3 happens.
3. **Chained session (Track B):** 6.5.2 → 6.5.7 → 6.5.5, each verified against the harness. A `/goal` loop fits here — success criterion = "bypass rate under target, CI green."
4. **Per safety PR:** a `/workflow` adversarial-review pass before merge — spawn N skeptics against the 6.5.3 trick set, block the PR if ≥2 find a bypass.

---

## Which mechanism for what

- **Parallel sessions / worktrees** — Track C only. Genuine isolation, one reviewable PR each. Their sweet spot.
- **One orchestrator + subagents** — *not* the top-level driver. A single session can't cleanly own 7 reviewable PRs across days, and its subagents share one working tree. Use subagents *within* a session for bounded research/exploration, not as the unit of PR delivery.
- **`/workflow`** — used *inside* the process, not *as* it. Its strength is ephemeral fan-out that returns data: red-teaming a finished safety PR before merge. Wrong tool for authoring-and-landing PRs over days.
- **`/goal`** — ideal for Track B, *because the harness now exists as the verifier.* Pair the goal with the harness as its oracle.

---

## Where hands-off has to stop

Human gates are non-negotiable here, regardless of how green CI is:

- **6.5.8 + 6.5.12 — the legal-posture gate.** ADR-0007's "confirm the parent-visibility edge
  with counsel" and ADR-0008's UK-only enforcement together back the whole compliance basis;
  neither can be self-certified by an agent, and both must be lawyer-reviewed. Hard stop for a
  human, and hard launch-blockers.
- **Track B merges (6.5.2 / 6.5.5 / 6.5.7).** A regression here is a child-safety regression,
  not a bug. Let the harness gate them, but keep a hand on the merge button.

The remaining Track C infra PRs (6.5.11, 6.5.6, 6.5.9) are fine to auto-merge once green.

---

## Standing constraints (apply to every session)

- Signed commits (1Password SSH agent); never `--no-gpg-sign`.
- PR-based; merge upstream branch into downstream — never merge to `main` directly, never force-push.
- Surgical changes: every changed line traces to the item being built.
- `pnpm typecheck` + `pnpm lint` pass before a PR is considered done.
- The pipeline owns no DB — it emits `flag` events; the web app persists them.
