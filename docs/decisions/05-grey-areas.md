# The Grey Area Problem

## The Challenge
Many of the most valuable questions a child can ask fall into grey areas — death, relationships, conflict, bodies, mental health, slurs they heard at school. Blocking these teaches nothing. Answering them badly erodes trust. Getting them right may be the product's defining feature.

## Decision: Flag-and-Forward (Option C) as the Core Approach
- The AI gives a brief, age-appropriate response to sensitive topics
- Parents are notified: "Your child asked about X — here's what they asked and what we said"
- Turns grey areas into parenting opportunities rather than walls
- Still requires the response itself to be appropriate — which leads to the trust question below

## Can the LLM Be Trusted to Respond Appropriately?
**Mostly yes, but not reliably enough to trust blindly.** Good at simplifying language, adjusting tone, avoiding explicit content. But fails in subtle ways:
- **Inconsistency** — 95% accuracy isn't enough when a child is the user
- **Over-explaining when probed** — repeated follow-ups can drill past the age-appropriate layer
- **Prompt injection** — older kids (or friends showing tricks) can attempt to bypass instructions
- **Context drift** — safety instructions fade in long conversations

## Mitigation Techniques (Defence in Depth)

### Response Validation (Second Model Call)
After the main LLM responds, a separate cheap model/prompt evaluates: "Is this appropriate for a [age]-year-old?" Fast, cheap, catches most drift. This is Layer 3 in practice.

### Conversation Depth Limits
Cap follow-ups on a single sensitive topic before the AI naturally redirects: "Great questions! Maybe you and your parents could explore this together?" Mitigates the "but why x5" drill-down problem.

### Escalated Prompting for Sensitive Topics
When input touches a known sensitive category, swap to a more constrained system prompt for that response. General prompt = "be a curious companion." Escalated prompt = "respond briefly, warmly, age-appropriately, suggest talking to a parent."

### Per-Session Context Anchoring
Re-inject safety instructions at regular intervals in the conversation (not just at the start). Fights context drift. Costs a few extra tokens but significantly improves consistency.

### Hard Output Blocklist
Regex/keyword scan on every output for things that should never appear — slurs, explicit terms, URLs, phone numbers, etc. Crude but effective as a final safety net.

## Response Pipeline for Grey Areas

```
Child asks question
  → Sensitive topic detected? Use escalated system prompt
  → LLM generates response
  → Output scan (hard blocklist)
  → Validation model: "Is this appropriate for age X?"
  → If flagged → fallback response + parent notification
  → If clean → show to child + log for parent dashboard
```

## Key Principle
Don't *trust* the LLM — *verify* it. The LLM does the creative work of generating a warm, age-appropriate response. The surrounding system makes sure it stayed within bounds.
