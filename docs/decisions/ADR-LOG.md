# Architecture Decision Record (ADR) Log

The dated, append-only record of architectural decisions for the child-safe LLM.

**How this differs from the rest of `decisions/`:** the numbered files (`00-seed`
through `15-outstanding-process-steps`) are *ideation and discussion* — a snapshot of how
thinking evolved during the pre-build phase. This log is the *formal decision record* from
build onward: each entry states what was decided, when, why, and what it commits us to.

**Format.** Each ADR has an ID, title, status, date, context, decision, and consequences.
Status is one of `Proposed` · `Accepted` · `Superseded by ADR-XXXX` · `Deprecated`. Add new
ADRs at the bottom with the next sequential ID; never renumber or delete — supersede.
Entries dated `2026-04-12` are **backfilled** from the ideation docs (ideation completed
that day) so the record is complete; everything later was decided in real time.

---

## ADR-0001 — Layered, defence-in-depth guardrails ("don't trust the LLM, verify it")

- **Status:** Accepted
- **Date:** 2026-04-12 *(backfilled from `03-guardrails-tech.md`)*

**Context.** A single safety filter — system prompt, blocklist, or one model — is not
sufficient for a children's product. Provider-level safety exists but isn't configurable
per family or strict enough.

**Decision.** Stack independent safety layers rather than rely on any one. Provider safety
+ per-child system prompt + hard output blocklist + a validation step, with sensitive-topic
escalation, conversation-depth limits, context anchoring, and flag-and-forward around them.

**Consequences.** More moving parts and latency, but no single point of failure. This is
the architecture the later research validated. See `architecture/02-guardrail-pipeline-layers.md`.

---

## ADR-0002 — Validate before show (non-streaming generation)

- **Status:** Accepted
- **Date:** 2026-04-12 *(backfilled from `03-guardrails-tech.md`)*

**Context.** Streaming tokens straight to the child means unsafe content can appear before
any check completes.

**Decision.** Generate the full response non-streaming, run every output check, and only
then emit it to the child (re-chunked as SSE for UX).

**Consequences.** Adds perceptible latency; accepted as the cost of never showing a
half-checked answer. The pipeline owns no DB — it emits `flag` events; the web app persists
them.

---

## ADR-0003 — Three-opinion output validation

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Two research passes showed the LLM-as-judge (gpt-4.1-nano) is the weak link:
story framing, apologies, and emoji can flip its verdict, and a bigger judge does not
reliably fix this. Safety improves with *decorrelated* failure modes, not more models.

**Decision.** Validate output with three non-correlated opinions: (R5) the existing general
LLM judge, (R3) a purpose-built safety classifier (Llama Guard / ShieldGemma / Detoxify),
and (R4) a non-LLM statistical classifier (fastText). Disagreement is treated as unsafe →
fallback. The deterministic blocklist (R2) sits under all three.

**Consequences.** One extra hosted call (Llama Guard ≈ $0.18/M) plus a self-hosted sidecar
for the non-LLM layer (the pipeline is Node/Hono, no Python today). Detoxify is a BERT, so
it belongs in the R3 slot, not the decorrelated R4 slot. See `architecture/02-guardrail-pipeline-layers.md`.

---

## ADR-0004 — Canonicalise on a scan-copy only; never mutate stored messages

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Homoglyphs, zero-width characters, and leetspeak defeat the blocklist and the
judge cheaply. NFKC normalisation defeats them — but NFKC is lossy and would corrupt
legitimate child input (accented names, maths notation) if applied to stored text.

**Decision.** Run canonicalisation (NFKC, homoglyph folding, zero-width stripping, de-leet)
on a throwaway scan copy ahead of the blocklist, on both input and output. The stored child
and AI messages remain byte-for-byte unchanged.

**Consequences.** A false-positive rate on real children's messages that needs tuning
against real traffic (tracked as an open question). Sub-millisecond cost.

---

## ADR-0005 — Phase 6.5 (Guardrail Hardening) before billing

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Mapping the research gaps against the plan showed several safety-critical items
scheduled *after* billing — a purpose-built classifier and red-teaming in Phase 10, rate
limiting in Phase 9. Shipping a paywall on top of a known-weak guardrail is the wrong order.

**Decision.** Insert **Phase 6.5 — Guardrail Hardening** between the parent dashboard
(Phase 6) and billing (Phase 7). Pull the classifier + eval harness forward from 10.1 and
core rate-limiting forward from 9.5. Phase 7 is gated on Phase 6.5 Tier P0 + P1.

**Consequences.** Billing slips later; the core product is solid before we charge for it.
See `phase-6.5-guardrail-hardening.md`.

---

## ADR-0006 — scrypt (node:crypto) for child PIN/password hashing

- **Status:** Accepted
- **Date:** 2026-06-20 *(shipped in PR #19, #17)*

**Context.** Child PINs and the child password were stored/compared as plaintext
(`pinHash = data.pin`). Pre-existing debt flagged during Phase 6 review.

**Decision.** Hash with `node:crypto` scrypt — random salt + `timingSafeEqual`, zero new
dependencies. Type-guard inputs (non-string → clean auth failure, not a 500) and enforce PIN
format server-side (4 digits → 400).

**Consequences.** No plaintext credentials at rest. Bcrypt/Argon2 were avoided to keep the
dependency surface minimal. Follow-up: the default child password is the username — force a
change on first login (Phase 6.5.11).
