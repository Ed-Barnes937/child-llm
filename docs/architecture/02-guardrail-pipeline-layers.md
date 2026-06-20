# Guardrail Pipeline — Layer-by-Layer Reference

The ordered set of layers a message passes through, split into the **query path**
(child → model) and the **response path** (model → child). This is the detailed
companion to [`decisions/03-guardrails-tech.md`](../decisions/03-guardrails-tech.md),
synthesised from the two-pass guardrail research (LLM-as-judge rigour + non-LLM
attack-resistant layers).

Each layer is tagged:

- **`[now]`** — implemented in the current pipeline (`apps/pipeline`)
- **`[add]`** — recommended by the research, not yet built

---

## Query path — child's message before it reaches the model

| # | Layer | Status | What it does |
|---|-------|--------|--------------|
| Q1 | **Canonicalise text** | `[add]` | NFKC normalise, fold homoglyphs/confusables, strip zero-width chars, de-leet — on a *scan copy* only. Defeats the cheapest evasion before any matcher runs. Highest rigour-per-effort win. |
| Q2 | **Input blocklist / obscenity scan** | partial | The `obscenity` + regex layer currently runs on output; mirror it onto canonicalised input so blatant junk never reaches generation. |
| Q3 | **Sensitive-topic detection** | `[now]` | Regex across ~8 categories on the child's input. |
| Q4 | **Conversation-depth tracking** | `[now]` | Counts consecutive sensitive turns; redirects to parents after the threshold (3). |
| Q5 | **Behavioural signals** | `[add]` | Rate/velocity limits, repeated-probe detection. Medium-confidence layer; catches the persistent adversarial child that single-message checks miss. |
| Q6 | **System-prompt assembly** | `[now]` | Per-child prompt from preset + sliders + calibration + absolute-blocker rules. |
| Q7 | **Escalated prompt swap** | `[now]` | On a detected sensitive topic, swap in the constrained system prompt. |
| Q8 | **Context anchoring** | `[now]` | Re-inject safety instructions every N messages in long conversations. |

**→ Generation:** non-streaming call to gpt-4o-mini via OpenRouter `[now]` —
deliberately non-streaming so the *full* response can be checked before the child
sees any of it.

---

## Response path — model's output before it reaches the child

| # | Layer | Type | Status | What it does |
|---|-------|------|--------|--------------|
| R1 | **Canonicalise output** | Deterministic | `[add]` | Same normalisation as Q1, so the blocklist can't be slipped past with homoglyphs in the *response*. |
| R2 | **Hard output blocklist** | Deterministic (regex / lexical) | `[now]` | `obscenity` (profanity/explicit), regex (weapons/drugs/self-harm/URLs/emails), `libphonenumber-js` (phone numbers). Zero false negatives on what it knows; zero generalisation. Non-overridable by the model. |
| R3 | **Purpose-built safety classifier** | **Fine-tuned LLM / neural** | `[add]` | Second opinion — Llama Guard / ShieldGemma / Detoxify. Trained on a safety taxonomy rather than asked to reason like the gpt-4.1-nano judge. |
| R4 | **Statistical / lexical classifier** | **Non-LLM** | `[add]` | Third opinion — fastText (genuinely linear, no transformer). Fails on completely different inputs from the two LLMs. |
| R5 | **LLM-as-judge validation** | Generative LLM | `[now]` | gpt-4.1-nano: "appropriate given these settings?" → APPROPRIATE/INAPPROPRIATE, **fail-closed**. The layer to *stop over-trusting*, not remove. |
| R6 | **Output sensitive-topic scan** | Regex | `[now]` | Scans the *AI response* for sensitive topics, not just the input. Shipped in PR #19 (#16). |
| R7 | **Flag-and-forward** | — | `[now]` | sensitive / blocked / validation-failed → flag surfaced to the parent + safe fallback reply to the child. Pipeline emits the event; the web app persists the flag. |

---

## The three-opinion design (output side)

The core principle from the research: **it is not "more models = safer", it is
"decorrelated failure modes = safer".** Two transformers trained on overlapping
safety data can miss the same adversarial input together. A linear classifier and a
deterministic blocklist are the layers that break *that* correlation.

The target is three non-correlated opinions on the same output:

1. **R5 — general LLM judge** (gpt-4.1-nano) — reasons about appropriateness given
   the child's settings. `[now]`
2. **R3 — purpose-built safety classifier** (Llama Guard / ShieldGemma / Detoxify) —
   a second opinion trained on a safety taxonomy. `[add]`
3. **R4 — non-LLM statistical classifier** (fastText) — a third opinion that fails on
   genuinely different inputs. `[add]`

Plus the deterministic **R2 blocklist** underneath all three — the one layer with
zero false negatives on what it already knows.

---

## Cost comparison — second-opinion and third-opinion layers

Hosted pricing is the figure cited in implementation-plan item 10.1. Self-host
numbers are **order-of-magnitude estimates** (`~est`) — verify before committing
spend.

### Second opinion (the heavier classifier) — pick one

| Option | What it is | Run mode | Marginal cost | Added latency | Integration effort | Independence from gpt-4.1-nano judge |
|--------|-----------|----------|---------------|---------------|--------------------|--------------------------------------|
| **Llama Guard 3 (8B)** | Safety-tuned LLM, child-exploitation categories | OpenRouter (hosted) | **~$0.18/M tok** | +200–600ms (extra API hop) `~est` | **Low** — another API call on infra you already use (~hours) | Medium — still a transformer |
| **ShieldGemma (2B/9B)** | Safety-tuned LLM (Gemma) | Self-host only (not on OpenRouter) | Compute only: ~$5–30/mo always-on machine `~est` | +50–150ms GPU / slower CPU `~est` | **High** — stand up a model server + GPU ops (~days) | Medium — still a transformer |
| **Detoxify** | Fine-tuned **BERT** (toxicity) | Self-host (CPU-friendly) | Compute only: ~$5–15/mo or fold into existing box `~est` | +10–50ms CPU `~est` | **Medium** — Python sidecar, no GPU (~1 day) | Low-Medium — neural but different training data |

### Third opinion (the decorrelated, non-LLM layer)

| Option | What it is | Run mode | Marginal cost | Added latency | Integration effort | Independence |
|--------|-----------|----------|---------------|---------------|--------------------|--------------|
| **fastText** | Linear classifier, no transformer | Self-host (CPU) | Effectively **free** | **<5ms** `~est` | Low-Medium — tiny sidecar or JS bindings (~1 day) | **High** — fails on genuinely different inputs |

### How to read it

- Cheapest path to a real second opinion: **Llama Guard on OpenRouter** — lowest
  effort, no new infra, ~$0.18/M.
- Cheapest *decorrelated* third opinion: **fastText** — free, sub-5ms.
- **Architectural caveat:** the pipeline is Node/Hono and owns no DB or Python today.
  Detoxify, ShieldGemma, and fastText all imply a **sidecar service**; Llama
  Guard-via-OpenRouter does not. That is the real reason the hosted option scores
  "Low" effort.

### Two honesty caveats

1. **"Free" needs an asterisk.** Llama Guard and ShieldGemma are open-weight — free
   only if you self-host (you pay compute/ops). Via OpenRouter, Llama Guard is
   ~$0.18/M, not free. ShieldGemma is not on OpenRouter, so it is self-host-only.
2. **Detoxify is not non-LLM.** It is a fine-tuned BERT (a transformer), so it
   correlates with Llama Guard's failure modes more than you want from a "third,
   independent" opinion. Treat Detoxify as an *alternative for the R3 slot*, not the
   R4 slot. The genuinely decorrelated non-LLM layer is fastText / pure lexical.

---

## The shape of the argument

The deterministic layers (R2, Q1/R1) and the parent-controlled prompt (Q6) are the
rigorous parts; the LLM judge (R5) is the layer most over-trusted. The single biggest
structural improvement is not a better judge — it is adding *cheap, attack-resistant,
non-correlated* layers around it: canonicalisation on both paths (Q1/R1) and at least one
classifier (R3) plus ideally a non-LLM third opinion (R4), so two independent things must
fail before anything reaches a child. (Output-side topic scanning, R6, has now shipped.)
