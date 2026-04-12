# Guardrails — Technical Approach

## Decision: Layered Safety Architecture

### MVP (Layer 1 + Layer 3)
- **System prompts** tailored per parent-configured preset — sets the baseline tone, vocabulary, and boundaries
- **Output filtering** via existing moderation APIs (e.g. OpenAI Moderation, LlamaGuard, or similar) — catches cases where the LLM slips past the system prompt
- **Response validation** — a second, cheap model call evaluates "is this appropriate given the current guardrail settings?"
- No custom model training needed. Use existing LLM APIs with additional filtering on top.

### Parent Controls
- Parents configure guardrails via presets with customisable sliders
- Presets bundle sensible defaults — parents pick a starting point, tweak from there
- Controls cover: vocabulary level, response depth, answering style, interaction mode, topic access, session limits, parent visibility

### Sensitive Topic Handling
- **Onboarding calibration** — parents shown example difficult questions with pre-canned answers at different appropriateness levels. Parents pick (or write their own). Calibrates the LLM's behaviour for that child.
- **Escalated prompting** — sensitive topics trigger a more constrained system prompt for that response
- **Absolute blockers** — some topics always redirect to "ask your parents/trusted adult" regardless of settings
- **Flag-and-forward** — sensitive/blocked responses flag the parent with what was asked and what was said

### Defence in Depth (Response Pipeline)
```
Child asks question
  → Sensitive topic detected? Use escalated system prompt
  → LLM generates response
  → Output scan (hard blocklist — slurs, explicit terms, URLs, etc.)
  → Validation model: "Is this appropriate given the guardrail settings?"
  → If flagged → fallback response + parent notification
  → If clean → show to child + log for parent dashboard
```

### Additional Safeguards
- **Conversation depth limits** — caps follow-ups on sensitive topics before redirecting to parents
- **Per-session context anchoring** — safety instructions re-injected at regular intervals to fight context drift
- **Hard output blocklist** — regex/keyword scan as a final safety net

### Intent Routing for Restricted Presets (UX-Driven, Not ML-Driven)
- Children on more restricted presets select their intent through the UI before chatting
- e.g. "I want to learn about...", "Help me with my homework...", "Let's write a story about..."
- Maps to tailored system prompts per intent — constrains interaction without ML overhead
- More independent presets get freeform access (with output filtering still active)

### Future Layers (post-MVP)
- **Input filtering** (pre-LLM) — classifiers or keyword scanning before the message reaches the LLM
- **Full intent router** — automated classification for freeform interactions
- These add robustness but also complexity and latency — earn the need first

## Key Insight
Existing LLM providers already have content safety baked in. This product adds *additional, stricter, parent-configured* filtering on top. Don't trust the LLM — verify it.
