# Initial Thinking

## Decisions Made

**Account model:** Parent-owned accounts. Parents sign up as owners, create and moderate child accounts.

**Primary user:** Children. Parents have a dashboard for oversight, billing, moderation settings.

**Target environment:** Home use first. School/institutional licensing is a plausible growth path but not the initial focus.

**Core philosophy:** AI as a tool for curiosity, creativity, and learning — NOT entertainment, NOT a friend/companion. The product empowers children to explore safely.

**Guardrail philosophy:** Parents get direct control over guardrails via customisable presets. Sensible defaults applied out of the box. No age tiers — parents configure the experience based on their knowledge of their child.

**Form factor:** Mobile-first web app. PWA initially, native wrapper possible later. Web tech is the founder's expertise.

**Tech approach:** Use existing LLM APIs with layered guardrails (system prompts + output filtering). NOT training a custom model.

**Legal jurisdiction:** UK-based product. Primary compliance framework is UK GDPR + AADC. COPPA compliance needed if/when US users arrive.

**AI persona:** No persona. No name, no character. Treated like a search engine. Tone is "favourite teacher" — friendly, approachable, not patronising. Adjustable language level per preset.

## Open Questions (Remaining)
- Business model (subscription, pricing, unit economics)
- Exact preset definitions and what each configures
- Detailed UX and design for both parent and child experiences
- Architecture and tech stack decisions
- Product name/branding

## Founder Context
- Deep experience using LLMs (GPT, Claude, Gemini, Copilot, Claude Code)
- Strong web tech background
- UK-based
- No experience training custom models or building bespoke LLM layers
