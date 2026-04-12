# V1 / V2 Scope

## V1 — Launchable Product

### Core
- Parent registration + payment (trial with card upfront)
- Parent onboarding flow (create first child, preset selection, sensitive topic calibration)
- Child account creation with child-set PIN
- Parent dashboard (at-a-glance summary, tabs per child, flagged conversations)
- Child home screen with chat list and "Inspire me" button

### Child Experience
- Chat-based UX (WhatsApp-style)
- Structured intent selection for restricted presets (parent-configurable categories)
- Freeform text input for independent presets
- Text-only responses (rich media deferred to V2)
- Conversation persistence with configurable retention window + auto-summary
- Conversation history browsing
- "Report unsatisfactory answer" on every AI response
- Session limit warnings before cutoff
- WCAG AA compliance

### Parent Experience
- Preset selection with slider customisation per child
- Sensitive topic calibration (example questions with levelled answers + custom answers)
- Flagged conversation review (sensitive topics + child-reported unsatisfactory answers)
- Full conversation detail view (within retention window)
- Conversation summaries (post-retention)
- Child settings management (sliders, calibration, PIN view/reset, intent categories, inspire me topics)
- Multi-child management (add children, tab per child)
- Account & billing management
- Data export (GDPR)
- Account & data deletion
- Parent-seeded "Inspire me" topics

### Technical
- Single LLM model (mid-tier, e.g. GPT-4o-mini class)
- System prompts tailored per preset configuration
- Output filtering via moderation API
- Response validation (second model call)
- Escalated prompting for sensitive topics
- Absolute topic blockers with redirect
- Hard output blocklist (regex/keyword scan)
- Conversation depth limits on sensitive topics
- Per-session context anchoring (re-inject safety instructions)
- Conversation storage (we own this — LLM APIs are stateless, no built-in persistence)
- Configurable data retention + auto-purge pipeline (legal requirement, not optional)
- Conversation summarisation on expiry
- Encryption at rest and in transit
- Mobile-first PWA

### Legal
- UK GDPR compliance
- AADC compliance
- DPIA (will need professional help)
- Privacy policy, terms of service
- Transparent pricing / no dark patterns on cancellation

---

## V1.5 — Fast Follow

### Features
- Child customisation (wallpapers, themes, colours — "MySpace for LLM chats")

---

## V2 — Post-Launch

### Features
- Rich media in responses (images/diagrams, with usage limits — significant cost implications)
- Voice input/output (significant technical addition, essential for youngest non-typing users)
- Journal/notebook (save AI responses to a personal collection)
- Gamification — exploration maps, weekly topic roundups (designed carefully for AADC)
- Shared discoveries (child shares notebook items with parent)
- Daily/weekly digest emails for parents
- Usage trend analytics over time for parents
- Parent-set challenges ("Ask the AI about the solar system today!")

### Technical
- Auto model switching / routing (OpenRouter or similar, once prompts validated across models)
- Input filtering (pre-LLM classifiers/keyword scanning)
- Full automated intent router for freeform interactions
- Native app wrapper (iOS/Android)

### Expansion
- Multi-region pricing
- International / multilingual support
- School/institutional licensing (per-seat, teacher dashboard, curriculum alignment)
- COPPA-specific verifiable consent mechanisms (for active US marketing)

### Accessibility (beyond WCAG AA)
- Dyslexia-friendly font options
- Motor accessibility aids
- Multilingual UI

---

## Still TBD (Decide Before Implementation)

- Exact pricing / plan tiers (family subscription vs. budget allocation vs. hybrid)
- Exact message/token limits per plan
- Specific LLM model selection
- Notification preferences UX (per child, per type)
- Product name / branding
- Number and content of onboarding calibration questions
- Preset definitions (how many, what each configures exactly)
- Trial duration and limits
