# Product Brief: Child-Safe LLM Experience

## Vision

A child-safe AI chat tool that empowers children to explore curiosity, creativity, and learning — safely, with parents in control. Existing LLM products (ChatGPT, Claude, etc.) are designed for adults. Children are already using them unsupervised, with the risk of receiving answers not tailored for their age or family values. This product fills that gap.

**What it is:** A learning tool — like a search engine with guardrails.
**What it is not:** Entertainment, a friend, a parenting coach.

---

## Target Users

**Primary user:** Children (no minimum or maximum age — guardrail settings determine appropriateness).

**Secondary user:** Parents — they sign up, pay, create child accounts, and configure guardrails.

**Target environment:** Home use first. School/institutional licensing is a plausible growth path but not the initial focus.

**Geographic focus:** UK-based product, built for UK compliance first. International expansion later.

---

## Account Model

- **Parent accounts** own everything — billing, settings, child management.
- **Child accounts** are created by parents, each with their own guardrail configuration.
- **Single app, dual login** — shared home page with "Login as parent" or "Login as child." Supports same-device (parent's tablet) and separate-device (child's own phone) usage.
- **Multi-child support** — tab per child on the parent dashboard. First child set up during onboarding, additional children added trivially.

---

## Guardrails: No Age Tiers — Parent-Controlled Presets

Age is an imperfect proxy for "what's appropriate for this child." Instead of age tiers, parents directly configure the dimensions that matter.

### Preset System
- Parents choose a named **preset** during child account setup (e.g. "Early learner", "Confident reader", "Independent explorer").
- Presets bundle sensible defaults across all dimensions.
- Parents can tweak individual sliders from the preset starting point at any time.

### Configurable Dimensions

| Dimension | Range |
|---|---|
| Vocabulary level | Simple → Rich |
| Response depth | Short & concrete → Detailed & nuanced |
| Answering style | Socratic (guides with questions) → Direct (gives answers) |
| Interaction mode | Structured prompts → Freeform text |
| Topic access | Restricted → Open |
| Session limits | Short / few messages → Long / unlimited |
| Parent visibility | Full conversation review → Summaries & flags only |

### Why This Approach
- Handles edge cases naturally (learning disabilities, gifted children, neurodiverse kids, different family values)
- No awkward tier boundaries or transitions
- Inclusivity is a core feature — parents know their child better than any algorithm

---

## Guardrails: Technical Approach

### MVP: System Prompts + Output Filtering
- **System prompts** tailored per preset configuration — sets tone, vocabulary, and boundaries.
- **Output filtering** via moderation APIs — catches cases where the LLM slips past the system prompt.
- **Response validation** — a second, cheap model call evaluates appropriateness against guardrail settings.
- No custom model training. Existing LLM providers already have safety baked in — this product adds stricter, parent-configured filtering on top.

### Sensitive Topic Handling
- **Onboarding calibration** — during setup, parents are shown difficult example questions (e.g. "How are babies made?") with pre-canned answers at different appropriateness levels. Parents pick or write their own. This calibrates the LLM and builds trust.
- **Escalated prompting** — sensitive topics trigger a more constrained system prompt.
- **Absolute blockers** — some topics always redirect: "That's not something I'm able to answer — try asking your parents or a trusted adult."
- **Flag-and-forward** — sensitive/blocked responses notify the parent with what was asked and what was said.

### Defence in Depth Pipeline
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
- Conversation depth limits on sensitive topics before redirecting to parents
- Per-session context anchoring — safety instructions re-injected at intervals to fight drift
- Hard output blocklist as a final safety net

### Future Layers (Post-MVP)
- Input filtering (pre-LLM classifiers)
- Automated intent routing for freeform interactions

---

## AI Persona & Tone

### No Persona
The AI has no name, no character, no backstory. It's a tool, like a search engine. This avoids parasocial attachment, anthropomorphism concerns, and entertainment drift.

The product itself has a brand name. The AI functionality is unnamed.

### Tone: "The Favourite Teacher"
- Always friendly, approachable, encouraging, clear, respectful
- Never patronising, never "a friend"
- What changes per preset: grammar complexity, vocabulary, response structure
- What stays constant: warmth, approachability, honesty

### Handling Uncertainty
- The AI admits when it's unsure rather than hallucinating
- "I'm not sure" moments can flag the parent
- Every response has a "report unsatisfactory answer" option for the child

---

## Child Experience

### Core Principle
Zero friction to start a conversation. Safety is why parents buy it — the child's experience is why they keep it.

### Key Decisions
- **Chat-based UX** — WhatsApp-style, familiar across all ages.
- **Rich media** — images and diagrams available alongside text. Subject to usage limits for cost.
- **Conversation persistence** — chats persist within a configurable retention window, then condense into deletable summaries.
- **Child customisation** — children personalise the visual experience (wallpapers, themes, colours). "MySpace for LLM chats." They customise the space, not the AI.
- **"Inspire me" button** — proactive topic suggestions for children who open the app without a question.
- **Structured prompts for restricted presets** — younger/more restricted children select intent via UI ("I want to learn about...") rather than facing a blank text box.
- **Session wind-down** — children warned before hitting limits, not abruptly cut off.

### Not in V1
- Voice input/output (v2)
- Baked-in interactive elements like quizzes/polls (children can ask the AI to create these)
- Gamification (no streaks, badges, or leaderboards)
- Journal/notebook save feature (explore in design phase, possibly v2)

### Accessibility
- WCAG AA compliance by default at launch
- Additional features (dyslexia fonts, motor aids, multilingual) layered in later

---

## Parent Experience

### Core Principle
Trustworthy and effortless. A control panel and a window into their child's learning. NOT a parenting coach.

### Onboarding
- Creates the parent account and first child profile
- Parent picks a preset, optionally tweaks sliders
- **Calibration mechanic** — shown difficult example questions with answer options at different levels. Calibrates the LLM and educates the parent about the product.
- Goal: minimal steps from sign-up to the child's first conversation

### Dashboard
- **At-a-glance homepage** — budget remaining, per-child activity summaries (word clouds, message counts), flagged conversations, quick access to child management.
- **Tab per child** for multi-child families.
- Guardrail controls accessible but not the primary view — set and forget.

### Flagging System
- AI flags conversations to parents — for sensitive topics AND when a child can't get an answer they're looking for.
- Surfaces what happened and lets the parent decide (adjust guardrails or have the conversation themselves).
- **Not prescriptive** — no suggested conversation starters, no parenting advice.

### Parent-Seeded Inspiration
- Parents can seed topics into the child's "Inspire me" button.
- Lightweight, optional, creates shared engagement.

### Admin
- Billing, account management, add/remove children
- Data export (GDPR right)
- Account and data deletion

---

## Legal & Privacy

### Primary Framework: UK GDPR + Age Appropriate Design Code (AADC)
- **Privacy by default** — highest privacy settings applied by default. Aligns with our preset model.
- **DPIA required** — formal Data Protection Impact Assessment before launch. Will need professional help.
- **Best interests of the child** — design choices must demonstrably benefit the child.
- **Profiling restrictions** — profiling off by default. Any AI personalisation needs careful handling.
- **Nudge restrictions** — no design patterns encouraging children to weaken privacy or over-engage.
- **Age estimation** — parent-created accounts help, but need safeguards against children creating fake parent accounts.
- **Enforced by the ICO.**

### COPPA (US) — Secondary, When US Users Arrive
- UK AADC compliance gets ~90% of the way to COPPA for free.
- Main gap: COPPA's specific verifiable parental consent mechanisms.
- Don't geo-restrict — close the gap before actively marketing to the US.

### Data Retention
- Conversations persist within a configurable retention window, then condense into deletable summaries.
- Parents can review full conversations for a longer window than the child sees.
- Aligns with UK GDPR data minimisation requirements.
- Robust data retention, deletion, and audit pipeline needed from day one.

### Encryption & Security
- Encryption at rest and in transit — mandatory.
- Audit logging (who accessed what, when).

---

## Business Model

### Pricing Philosophy: Radical Transparency
- Explicitly declare costs and justify pricing
- No discounts, no retention tricks, no dark patterns on unsubscription
- Treat parents as adults — show value and costs honestly

### Free Trial, Not Freemium
- Time-limited trial with account limits to offset costs
- No permanent free tier — per-message API costs make freemium unsustainable

### Pricing Model: Two Approaches Under Consideration

**Approach A: Family Subscription Plans**
- Tiered plans (Starter / Family / Premium) with increasing child count and usage allowances
- Simple, predictable, familiar

**Approach B: Budget Allocation Model**
- Parent buys a monthly budget, allocates across children
- Children can request more credit; parents can top up
- Maximum parental control over spend, naturally teaches resource management

Both viable — decision deferred to closer to implementation. Could combine (subscription gives a monthly budget).

### LLM Model Strategy
- **V1: Single model** — thorough testing of guardrails against one model for safety confidence. Likely a cost-effective, mid-tier model (GPT-4o-mini class).
- **V2: Auto-switching / model routing** via OpenRouter once prompts validated across multiple models.

### Image Generation
- Available but separately limited — significantly more expensive per request.

---

## Competitive Landscape

### Key Competitors
- **Genie (Google)** — child AI chatbot, educational, locked to Google ecosystem
- **Khanmigo (Khan Academy)** — AI tutor, Socratic approach, curriculum-coupled
- **Moxie** — physical robot companion, hardware play, expensive

### Our Differentiator
Not "child-safe AI" generically — Google can do that. It's **parent-controlled, curiosity-driven AI** where families set their own boundaries. Nobody else treats parental customisation as a core feature.

### Moat
Tech alone won't be the moat (LLM APIs are commoditised). The moat is:
- Trust relationship with parents
- Quality of the guardrails/controls UX
- Getting the tool-like, curiosity-encouraging tone right

---

## Form Factor & Tech

- **Mobile-first web app** — PWA initially, native wrapper possible later (V2)
- **Frontend:** TanStack Start (React) + TanStack Router + TanStack Query
- **Styling:** Tailwind CSS + Shadcn/ui (custom theme pass before launch)
- **Auth:** Better Auth (parent accounts) + custom logic (child username/password + PIN)
- **Database:** PostgreSQL (Drizzle ORM) on Fly.io London
- **Pipeline service:** Hono (TypeScript) on Fly.io London — handles guardrails pipeline
- **LLM:** OpenRouter (GPT-4o-mini primary, GPT-4.1 nano validation)
- **Hosting:** Fly.io — all services in London region (UK data residency)
- Full tech stack details in architecture/00-tech-stack.md

---

## What's Next

1. ~~Design / UX exploration~~ — screen map complete
2. ~~Architecture and tech stack~~ — decisions captured
3. /grill-me to stress-test decisions
4. Implementation planning
