# Business Model

## Pricing Philosophy

### Decision: Radical Transparency
- Be explicit about what the service costs to run and what the margin is
- No discounts, no retention tricks, no dark patterns around unsubscription
- If a user wants to unsubscribe, make it easy — no guilt, no "are you sure?" gauntlet
- Justify the price by showing the value and the costs — treat parents as adults
- This aligns with the product's core ethos: trustworthiness. Be trustworthy with their child AND their money.

## Trial & Conversion

### Decision: Free Trial, Not Freemium
- Time-limited free trial with account limits to offset costs (e.g. reduced message allowance, limited features)
- No permanent free tier — the per-message API costs make freemium unsustainable without significant volume
- Trial should be long enough for a child to form a habit and for the parent to see value

## Pricing Model

### Decision: Two Approaches to Document — Decide Closer to Implementation

**Approach A: Family Subscription Plans**

| Tier | Includes |
|---|---|
| Starter | 1 child, standard message allowance, limited image generation |
| Family | Up to 3 children, higher message allowance, more image generation |
| Premium | Unlimited children, highest allowance, full features |

- Simple, predictable, familiar (Netflix model)
- Pricing TBD — should feel like a "no brainer" alongside existing family subscriptions (Netflix, Spotify, etc.)
- Annual discount option for retention and cash flow

**Approach B: Budget Allocation Model**

- Parent pays monthly for a "budget" (token/message credit)
- Parent allocates budget across their children as they see fit
- When a child runs out of credit, they can request more from the parent
- When the parent's account runs out, they can top up
- Pros: maximum parental control over spend, naturally teaches children about resource management, cost scales directly with usage
- Cons: more complex UX, could create friction if a child runs out mid-conversation

Both approaches could work — the budget model is more innovative and gives parents more granular control, the subscription model is simpler to understand and market. Could even combine them (subscription gives a monthly budget, top-ups available).

## Token / Message Limits

- Not defining specific limits at ideation stage
- Design principle: cater to average usage per child plus headroom
- Limits serve dual purpose: cost management AND parental control (session limits are a guardrail slider)
- Image generation needs separate limits or budget allocation — it's significantly more expensive per request

## LLM Model Strategy

### Decision: Single Model for V1
- V1 uses one well-chosen model across all interactions
- Reason: guardrails (system prompts, output validation, tone calibration) need to be tested against a specific model. Different models respond differently to the same prompts. Single model = thorough testing = confidence in the safety layer.
- V2 can add auto-switching / model routing (OpenRouter supports this natively) once prompts have been validated across multiple models
- Model selection criteria: cost-effective, strong instruction following, good at tone/vocabulary adjustment, reliable safety behaviour. Likely a mid-tier model (GPT-4o-mini class) rather than flagship.

## Cost Structure (For Reference)
- Per-message LLM cost: ~£0.002–£0.02 depending on model
- Per-message validation cost: ~£0.001
- Per-image generation: ~£0.02–£0.08
- These costs inform pricing but exact figures depend on model choice and negotiated API rates

## Not In Scope for V1
- Multi-region pricing
- School/institutional licensing
- Per-child pricing model (rejected — feels punitive for larger families)

## Future Considerations
- School/institutional pricing (per-seat, annual contracts, teacher dashboards)
- Volume-based API rate negotiation as user base grows
