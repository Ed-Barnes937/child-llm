# Age Tiers — Decision

## Decision: No Age Tiers. Parent-Controlled Guardrail Sliders.

Age is a proxy for "what's appropriate for this child" — but it's an imperfect one. Instead of asking for a child's age and mapping to tiers, parents directly configure the dimensions that matter.

### Why This Is Better
- Handles edge cases naturally (learning disabilities, gifted children, different family values, neurodiverse kids)
- No awkward tier boundaries or transitions
- No minimum or maximum age — the guardrail settings themselves determine appropriateness
- Inclusivity is a core feature, not an afterthought
- Respects that parents know their child better than any age-based algorithm

### Parent Controls (Sliders / Settings per Child)

| Dimension | Range |
|---|---|
| **Vocabulary level** | Simple → Rich |
| **Response depth** | Short & concrete → Detailed & nuanced |
| **Answering style** | Socratic (guides with questions) → Direct (gives answers) |
| **Interaction mode** | Structured prompts ("I want to learn about...") → Freeform text |
| **Topic access** | Restricted (narrow set of topics) → Open (wide access) |
| **Session limits** | Short / few messages → Long / unlimited |
| **Parent visibility** | Full conversation review → Summaries & flags only |

### Sensible Defaults
- The product ships with a sensible default configuration (likely toward the more protective end)
- Parents adjust from there based on their knowledge of their child
- No age input required at account creation — though it could optionally be used to suggest a starting default

### Onboarding UX: Presets as Onramps
- Parents choose a named preset when creating a child's account (e.g. "Early learner", "Confident reader", "Independent explorer")
- Preset bundles configure all sliders to a sensible combination
- Parents can tweak individual sliders later from the preset starting point
- Keeps first-time setup simple without sacrificing customisability
