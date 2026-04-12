# Implementation Plan — V1

This is the master checklist for building the V1 MVP. Each item is designed to be completable in a single working session (1-3 hours). Work through phases sequentially — tasks within a phase can sometimes be parallelised where noted.

For full context on any decision referenced here, see the `decisions/` and `architecture/` directories.

---

## Phase 0: Project Setup
Foundation. Nothing else works without this.

- [ ] **0.1** Initialise monorepo (pnpm workspaces or turborepo)
- [ ] **0.2** Set up TanStack Start app with TanStack Router + TanStack Query
- [ ] **0.3** Set up Hono pipeline service project within the monorepo
- [ ] **0.4** Set up shared TypeScript config, linting (ESLint + Prettier), and shared types package
- [ ] **0.5** Set up Drizzle ORM with PostgreSQL connection (local Docker Postgres for dev)
- [ ] **0.6** Set up Tailwind CSS + Shadcn/ui in the TanStack Start app
- [ ] **0.7** Dockerfiles for both services (TanStack Start app + Hono pipeline service)
- [ ] **0.8** Fly.io setup — create app, deploy both services to London region, provision Postgres
- [ ] **0.9** CI basics — GitHub Actions for lint + typecheck on PR (optional but recommended)

---

## Phase 1: Database Schema & Auth
The data model and parent authentication. Blocks everything else.

- [ ] **1.1** Design and implement core database schema in Drizzle:
  - Parent accounts
  - Child accounts (linked to parent)
  - Presets (per child)
  - Slider/guardrail configurations (per child)
  - Device registrations
- [ ] **1.2** Set up Better Auth for parent accounts (email + password, sessions, password reset)
- [ ] **1.3** Implement custom child auth logic:
  - Child username + password (for new device login)
  - Child PIN (for known device login)
  - Device token management (associate device with family)
- [ ] **1.4** Build the landing page (S1) — "I'm a parent" / "I'm a child" / "Sign up"
- [ ] **1.5** Build parent login screen (S2) + registration screen (S4)
- [ ] **1.6** Build child login screen (S3) — profile selector + PIN entry (known device), username + password (new device)
- [ ] **1.7** Implement route protection — parent routes require parent session, child routes require child session

---

## Phase 2: Parent Onboarding & Child Setup
The parent creates their first child account and configures guardrails.

- [ ] **2.1** Define preset configurations — what each preset ("Early learner", "Confident reader", "Independent explorer") sets across all slider dimensions
- [ ] **2.2** Build onboarding step 1 (S5) — child display name + preset selector
- [ ] **2.3** Build onboarding step 2 (S6) — sensitive topic calibration. Draft 3-5 example questions with levelled answer options. Include "write your own" and "skip" options.
- [ ] **2.4** Build onboarding step 3 (S7) — review & confirm. Show summary, allow editing, optional slider customisation.
- [ ] **2.5** Implement preset + calibration storage — save all config to the database against the child account
- [ ] **2.6** Build "add another child" flow — reuse onboarding steps from parent dashboard

---

## Phase 3: The Pipeline Service (Core Guardrails)
The heart of the product. This is the Hono service that handles LLM calls with safety layers.

- [ ] **3.1** Set up OpenRouter SDK/client in the pipeline service
- [ ] **3.2** Implement system prompt builder — takes a child's preset config + calibration answers and generates the appropriate system prompt
- [ ] **3.3** Implement the basic LLM call — send child's message with system prompt, receive streamed response from GPT-4o-mini via OpenRouter
- [ ] **3.4** Implement output blocklist — regex/keyword scan on every response before it reaches the child
- [ ] **3.5** Implement validation model call — send the response to GPT-4.1 nano with "is this appropriate given these guardrail settings?" prompt
- [ ] **3.6** Implement escalated prompting — detect sensitive topics in input, swap to constrained system prompt
- [ ] **3.7** Implement flag-and-forward — when validation flags a response or a topic is sensitive, create a flag record in the database and return a safe fallback response
- [ ] **3.8** Implement conversation depth tracking — count follow-ups on sensitive topics, redirect to parents after threshold
- [ ] **3.9** Implement context anchoring — re-inject safety instructions every N messages in the conversation
- [ ] **3.10** Implement service-to-service auth — API key check on all pipeline endpoints
- [ ] **3.11** SSE streaming endpoint — TanStack Start app connects and streams tokens to the client

---

## Phase 4: Child Chat Experience
The core child-facing UI.

- [ ] **4.1** Build child home screen (S20) — new conversation button, "Inspire me" button, previous conversations list
- [ ] **4.2** Build chat screen (S21) — message input, send button, streaming message display (WhatsApp-style bubbles)
- [ ] **4.3** Connect chat screen to pipeline service — send messages via TanStack Start server function → pipeline service → stream response back to client
- [ ] **4.4** Implement "Report unsatisfactory answer" button on each AI response — creates a flag record
- [ ] **4.5** Build intent selection screen (S21a) — visual cards for restricted presets. Wire up to skip/show based on child's preset config.
- [ ] **4.6** Implement "Inspire me" — fetch a random topic suggestion (hardcoded pool initially + parent-seeded topics)
- [ ] **4.7** Implement session limit warnings — track token/message/time usage, show inline warnings when approaching limits

---

## Phase 5: Conversation Storage & Persistence
Store conversations, enable history, and handle retention.

- [ ] **5.1** Design and implement conversation + message schema in Drizzle:
  - Conversations (linked to child account, timestamps, title/topic)
  - Messages (linked to conversation, role, content, timestamps, flag status)
  - Flags (linked to message, type, reason, reviewed status)
- [ ] **5.2** Implement conversation storage — save messages as they're sent/received during chat
- [ ] **5.3** Build conversation history screen (S22) — list of previous conversations, tappable to continue
- [ ] **5.4** Implement conversation continuation — load history, include in LLM context
- [ ] **5.5** Implement auto-summarisation — when a conversation passes the retention window, generate a summary via LLM and store it
- [ ] **5.6** Implement retention purge — cron/scheduled job to delete raw messages past the retention window, keeping only summaries
- [ ] **5.7** Build conversation summary view (S13) — display summary for expired conversations, with delete button

---

## Phase 6: Parent Dashboard
The parent's view into their children's activity.

- [ ] **6.1** Build parent dashboard (S8) — tab bar per child, at-a-glance summary panel
- [ ] **6.2** Implement per-child summary data — message counts, topic extraction (word cloud or list), usage stats
- [ ] **6.3** Build flagged conversations screen (S10) — list of flags, filter by child, tap to view detail
- [ ] **6.4** Build conversation detail screen (S11) — read-only chat view with flagged messages highlighted
- [ ] **6.5** Build child management screen (S9) — list of children, tap to settings
- [ ] **6.6** Build child settings screen (S9a) — preset selector, sliders, calibration answers, inspire me topics, intent categories, PIN management, data management
- [ ] **6.7** Implement parent-seeded "Inspire me" topics — CRUD from child settings, surface in child's Inspire me pool
- [ ] **6.8** Build app settings screen (S12) — notification preferences, display settings, legal links

---

## Phase 7: Billing & Account Management
Subscription, trials, and account admin.

- [ ] **7.1** Integrate payment provider (Stripe likely) — subscription plans, trial with card upfront
- [ ] **7.2** Build account & billing screen (S14) — plan status, payment management, upgrade/downgrade
- [ ] **7.3** Implement trial logic — trial period with limits, convert to paid on expiry
- [ ] **7.4** Implement usage tracking against plan limits — message/token budgets, enforce limits
- [ ] **7.5** Implement GDPR data export — generate downloadable export of all data for a child
- [ ] **7.6** Implement account deletion — full data deletion flow with confirmation
- [ ] **7.7** Implement transparent pricing page — show costs, justify pricing, no dark patterns

---

## Phase 8: Notifications & Flagging Polish
Wire up the notification system for parents.

- [ ] **8.1** Implement push notification infrastructure (web push for PWA)
- [ ] **8.2** Send push notifications for flagged conversations
- [ ] **8.3** Send notifications when a child hits their session limit
- [ ] **8.4** Implement notification preferences — per child, per type, configurable from parent settings
- [ ] **8.5** Implement flag review workflow — mark as reviewed, dismiss from dashboard

---

## Phase 9: PWA, Accessibility & Polish
Get it ready for real users.

- [ ] **9.1** PWA setup — service worker, manifest, install prompt, offline fallback
- [ ] **9.2** WCAG AA audit — check all screens against accessibility standards, fix issues
- [ ] **9.3** Responsive design pass — ensure all screens work on mobile, tablet, and desktop
- [ ] **9.4** Loading states, empty states, and error states across all screens
- [ ] **9.5** Rate limiting and brute-force protection on PIN/password entry
- [ ] **9.6** Encryption at rest confirmation — verify Fly.io Postgres encryption, TLS on all connections
- [ ] **9.7** Privacy policy and terms of service pages
- [ ] **9.8** End-to-end testing of critical flows (parent signup → onboarding → child login → chat → flag → parent review)

---

## Phase 10: Pre-Launch
Final steps before real users.

- [ ] **10.1** Red team the guardrails — attempt prompt injection, edge cases, inappropriate queries across all preset levels
- [ ] **10.2** Content finalisation — all calibration questions, preset definitions, system prompts, "Inspire me" pool, intent categories reviewed and polished
- [ ] **10.3** Custom design theme pass — replace Shadcn defaults with the product's visual identity
- [ ] **10.4** User validation — show to 5-10 parents, gather feedback, iterate
- [ ] **10.5** Define success metrics and instrument analytics
- [ ] **10.6** Product naming and branding
- [ ] **10.7** Landing/marketing page
- [ ] **10.8** Launch

---

## Phase V1.5: Fast Follow
After launch, before V2.

- [ ] **V1.5.1** Child customisation (S23) — wallpapers, themes, colours
