# Plan: Child-Safe LLM Experience — V1

> Source PRD: `.claude/ideas/decisions/PRODUCT-BRIEF.md`
> Screen Map: `.claude/ideas/design/00-screen-map.md`
> Tech Stack: `.claude/ideas/architecture/00-tech-stack.md`
> Auth Model: `.claude/ideas/architecture/01-auth-model.md`
> V1 Scope: `.claude/ideas/decisions/14-v1-v2-scope.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Monorepo**: pnpm workspaces or turborepo. Shared types package between app and pipeline service.
- **Frontend**: TanStack Start (React) + TanStack Router + TanStack Query. Deployed as a container on Fly.io London.
- **Pipeline service**: Hono (TypeScript). Deployed as a separate container on Fly.io London. Communicates with the app via private networking + shared API key.
- **Database**: PostgreSQL on Fly.io London. Managed via Drizzle ORM from the monorepo.
- **Auth (parent)**: Better Auth — email + password, sessions stored in Postgres.
- **Auth (child)**: Custom — username + password for new devices, 4-digit PIN for known devices. Device tokens stored in DB.
- **LLM**: OpenRouter — GPT-4o-mini (primary), GPT-4.1 nano (validation).
- **Styling**: Tailwind CSS + Shadcn/ui (Shadcn defaults during dev, custom theme pass pre-launch).
- **Hosting**: Fly.io — all services in London region (UK data residency).

### Key routes

```
/                     → Landing page (S1)
/parent/login         → Parent login (S2)
/parent/register      → Parent registration (S4)
/parent/onboarding    → Onboarding steps (S5-S7)
/parent/dashboard     → Parent dashboard (S8)
/parent/children      → Child management (S9)
/parent/children/:id  → Child settings (S9a)
/parent/flags         → Flagged conversations (S10)
/parent/conversation/:id → Conversation detail (S11)
/parent/settings      → App settings (S12)
/parent/billing       → Account & billing (S14)
/child/login          → Child login / profile selector (S3)
/child/home           → Child home / chat list (S20)
/child/chat/:id       → Chat conversation (S21)
/child/chat/new       → New conversation (→ S21a if restricted preset)
/child/history        → Conversation history (S22)
```

### Key schema shapes

```
parents        — id, email, password_hash, created_at, subscription_status
children       — id, parent_id, display_name, username, password_hash, pin_hash, preset_id, created_at
presets        — id, child_id, name, vocabulary_level, response_depth, answering_style, interaction_mode, topic_access, session_limits, parent_visibility
calibrations   — id, child_id, question_key, selected_answer, custom_answer
conversations  — id, child_id, title, created_at, updated_at, summary, summarised_at
messages       — id, conversation_id, role (child|ai), content, created_at, flagged
flags          — id, message_id, child_id, type (sensitive|blocked|reported|unsatisfactory), reason, reviewed, created_at
devices        — id, parent_id, child_id, device_token, registered_at, last_used
inspire_topics — id, child_id, topic, source (parent|system)
intent_categories — id, child_id, label, enabled
```

---

## Phase 1: The Tracer Bullet

**User stories**: Parent can sign up, create a child account, and the child can log in (on the same or a different device) and send a message that gets a streamed AI response.

### What to build

The thinnest possible path through every layer. Parent registers with email + password, goes through a minimal onboarding (name + preset selection only — no calibration yet), and a child account is created with a generated username. The child logs in — either via profile selector + PIN on a shared device, or username + password on their own device. The child sends a message, it hits the pipeline service which calls GPT-4o-mini via OpenRouter with a basic system prompt, and the response streams back to the chat UI.

This phase proves the entire architecture works: monorepo, both services, DB, auth, device management, streaming, and deployment.

### Sub-tasks

- [ ] Initialise monorepo with shared types package
- [ ] Set up TanStack Start app with TanStack Router + TanStack Query + Tailwind + Shadcn
- [ ] Set up Hono pipeline service project
- [ ] Set up Drizzle with Postgres (local Docker for dev)
- [ ] Implement core schema: parents, children, presets (defaults only), devices tables
- [ ] Set up Better Auth for parent accounts (register, login, sessions)
- [ ] Build landing page (S1) — "I'm a parent" / "I'm a child" / "Sign up"
- [ ] Build parent registration (S4) — email + password (no payment yet)
- [ ] Build parent login (S2)
- [ ] Build minimal onboarding — child name + preset selection only (S5, skip S6/S7 for now)
- [ ] Generate child username on account creation, store credentials
- [ ] Implement child auth — username + password login for new devices, PIN for known devices
- [ ] Implement device token registration and storage
- [ ] Build child login (S3) — profile selector + PIN (known device), username + password (new device)
- [ ] Build child home screen (S20) — new conversation button only (no history yet)
- [ ] Build chat screen (S21) — message input, send button, streaming message display
- [ ] Set up OpenRouter client in pipeline service
- [ ] Implement basic system prompt builder (preset → system prompt)
- [ ] Implement streaming LLM endpoint in pipeline service
- [ ] Wire chat screen → TanStack Start server function → pipeline service → streamed response
- [ ] Implement service-to-service auth (API key)
- [ ] Dockerfiles for both services
- [ ] Deploy to Fly.io London (app + pipeline + Postgres)
- [ ] Route protection — parent routes need parent session, child routes need child session
- [ ] Set up Playwright with test helpers (DB seeding/teardown, auth helpers)
- [ ] Playwright tests: parent signup → login, create child via onboarding, child login (PIN + password), send message + receive streamed response

### Acceptance criteria

- [ ] Parent can register with email + password
- [ ] Parent can log in and create a child account with a preset
- [ ] Child username is generated and visible to parent
- [ ] Child can log in on a shared device via profile selector + PIN
- [ ] Child can log in on a new device via username + password
- [ ] Child can send a message and receive a streamed AI response
- [ ] System prompt reflects the selected preset (e.g. vocabulary level differs between presets)
- [ ] Both services deploy to Fly.io and communicate over private networking
- [ ] Parent and child routes are protected by their respective auth

---

## Phase 2: Guardrails & Calibration

**User stories**: AI responses are safe and appropriate. Parents calibrate how the AI handles sensitive topics. Parents can tune guardrails via sliders.

### What to build

The full guardrails pipeline: output blocklist scanning, validation model call (GPT-4.1 nano), escalated prompting for sensitive topics, absolute topic blockers, and conversation depth limits on sensitive follow-ups. Context anchoring re-injects safety instructions every N messages.

On the parent side: the onboarding calibration mechanic (S6) where parents are shown difficult questions and pick appropriate answer levels. Slider controls in child settings (S9a) that adjust all guardrail dimensions. The system prompt builder incorporates both calibration answers and slider values.

### Sub-tasks

- [ ] Implement output blocklist — regex/keyword scan on every response
- [ ] Implement validation model call — GPT-4.1 nano checks appropriateness against guardrail settings
- [ ] Implement escalated prompting — detect sensitive topics, swap to constrained system prompt
- [ ] Implement absolute topic blockers — hardcoded redirects ("ask your parents")
- [ ] Implement conversation depth tracking — redirect after N sensitive follow-ups
- [ ] Implement context anchoring — re-inject safety instructions every N messages
- [ ] Implement fallback response mechanism — safe response when validation flags content
- [ ] Draft 3-5 calibration questions with levelled answer options
- [ ] Build onboarding calibration step (S6) — question cards, answer selection, "write your own", skip option
- [ ] Build onboarding review step (S7) — summary, edit links, slider access
- [ ] Implement calibration storage (calibrations table)
- [ ] Update system prompt builder to incorporate calibration answers
- [ ] Build child settings screen (S9a) — preset selector, all 7 sliders, calibration review/edit
- [ ] Update system prompt builder to incorporate slider values
- [ ] Wire web app to pass child's slider overrides and calibration answers to the pipeline service in the chat request
- [ ] Build intent selection screen (S21a) — visual cards for restricted presets
- [ ] Wire intent selection to show/skip based on interaction_mode slider

### Acceptance criteria

- [ ] Inappropriate content is caught by the output blocklist before reaching the child
- [ ] Validation model flags borderline responses and triggers a fallback
- [ ] Sensitive topics trigger escalated (more constrained) system prompt
- [ ] Absolute blockers return a redirect message regardless of settings
- [ ] Repeated follow-ups on sensitive topics are redirected after threshold
- [ ] Safety instructions are maintained throughout long conversations
- [ ] Parent can complete the calibration flow during onboarding
- [ ] Parent can skip calibration and get sensible defaults
- [ ] Parent can adjust sliders and the chat experience visibly changes
- [ ] Restricted presets show intent selection before freeform chat

---

## Phase 3: Conversation Persistence

**User stories**: Conversations are saved. Children can browse history and continue previous chats. AI has context from earlier in the conversation.

### What to build

Messages are stored as they're sent and received. The child home screen shows a list of previous conversations. Tapping a conversation loads its history and allows continuation with full context sent to the LLM. Conversations get an auto-generated title based on the first exchange.

### Sub-tasks

- [ ] Implement conversations and messages schema (if not already from Phase 1)
- [ ] Save messages to DB as they're sent/received during chat
- [ ] Auto-generate conversation title from first exchange
- [ ] Update child home screen (S20) — show previous conversations list
- [ ] Build conversation history screen (S22) — full list with titles and dates
- [ ] Implement conversation continuation — load history, include in LLM context window
- [ ] Handle context window limits — truncate or summarise older messages when conversation gets long

### Acceptance criteria

- [ ] Messages are persisted to the database during chat
- [ ] Child can see a list of previous conversations on their home screen
- [ ] Child can tap a conversation and continue it with context intact
- [ ] Conversations have auto-generated titles
- [ ] Long conversations handle context window limits gracefully

---

## Phase 4: Flagging & Parent Review

**User stories**: Parents are notified about sensitive conversations and unsatisfactory answers. Parents can review flagged conversations in detail.

### What to build

When the pipeline flags a response (sensitive topic, validation failure, or absolute blocker), a flag record is created. When a child taps "report unsatisfactory answer", that also creates a flag. The parent dashboard shows flagged conversations. Parents can tap through to see the full conversation with flagged messages highlighted. Flags can be marked as reviewed.

### Sub-tasks

- [ ] Implement flag creation in pipeline service (sensitive, blocked, validation-failed)
- [ ] Implement "report unsatisfactory answer" button on each AI response in chat UI
- [ ] Create flag record when child reports an unsatisfactory answer
- [ ] Build flagged conversations screen (S10) — list with child name, reason, date
- [ ] Build conversation detail screen (S11) — read-only chat view, flagged messages highlighted
- [ ] Implement flag review workflow — mark as reviewed, dismiss
- [ ] Show flagged conversation count/alert on parent dashboard (S8)

### Acceptance criteria

- [ ] Pipeline-detected flags (sensitive, blocked, validation) create flag records
- [ ] Child can report an unsatisfactory answer and it creates a flag
- [ ] Parent can see a list of all flagged conversations
- [ ] Parent can tap a flag and see the full conversation with the flagged exchange highlighted
- [ ] Parent can mark flags as reviewed
- [ ] Dashboard shows a count/alert for unreviewed flags

---

## Phase 5: Parent Dashboard & Child Management

**User stories**: Parents have a complete at-a-glance view. Parents can manage multiple children. Parents can seed "Inspire me" topics.

### What to build

The full parent dashboard with tabs per child, usage stats (messages today, budget remaining), topic summaries (word cloud or list extracted from conversations), and recent conversations. Child management screen for viewing all children. "Add child" reuses the onboarding flow. Parent-seeded "Inspire me" topics are stored per child and surface in the child's inspiration pool. The child's "Inspire me" button generates suggestions from both system and parent-seeded topics.

### Sub-tasks

- [ ] Implement usage tracking — count messages per child per day
- [ ] Implement topic extraction from conversations (keyword extraction or LLM-based summary)
- [ ] Build parent dashboard (S8) — tab bar per child, summary panel (usage, topics, flags, recent conversations)
- [ ] Build child management screen (S9) — list of children with status
- [ ] Implement "add child" flow — reuse onboarding from dashboard
- [ ] Implement inspire_topics CRUD — parent adds/removes topics from child settings (S9a)
- [ ] Implement intent_categories config — parent enables/disables categories from child settings
- [ ] Build "Inspire me" feature — child taps button, gets suggestion from system pool + parent-seeded topics
- [ ] Wire "Inspire me" into chat — suggestion flows into a new conversation

### Acceptance criteria

- [ ] Parent dashboard shows per-child tabs with usage stats, topic summaries, flags, recent conversations
- [ ] Parent can add a new child from the dashboard
- [ ] Parent can add/remove "Inspire me" topics for a child
- [ ] Parent can configure intent categories for restricted presets
- [ ] Child can tap "Inspire me" and get a topic suggestion
- [ ] Suggestion includes parent-seeded topics when available

---

## Phase 6: Retention, Summarisation & Limits

**User stories**: Conversations are retained for a configurable window then summarised. Children are warned before hitting limits. Old data is purged for compliance.

### What to build

Session/message limits (configured by parent via sliders) are enforced with inline warnings before cutoff. Conversations past the retention window are auto-summarised via an LLM call and the raw messages are purged. Summaries are viewable and deletable. A scheduled job handles the purge cycle. Parent configures the retention window from child settings.

### Sub-tasks

- [ ] Implement session limit tracking — message count, token usage, time per session
- [ ] Implement inline limit warnings in chat UI — gentle, not alarming
- [ ] Implement limit enforcement — block further messages when limit reached
- [ ] Implement retention window configuration in child settings (S9a)
- [ ] Build scheduled summarisation job — find conversations past retention, generate summary via LLM
- [ ] Implement message purge — delete raw messages after summary is generated
- [ ] Build conversation summary view (S13) — show summary, date range, flags raised, delete button
- [ ] Update conversation history (S22) — show summaries for expired conversations
- [ ] Ensure parent's review window is longer than child's view window

### Acceptance criteria

- [ ] Child sees a warning as they approach a session limit
- [ ] Messages are blocked (gracefully) when limit is reached
- [ ] Conversations past the retention window are automatically summarised
- [ ] Raw messages are purged after summarisation
- [ ] Summaries are viewable and deletable
- [ ] Parent can configure the retention window per child
- [ ] Parent can review full conversations for longer than the child can see them

---

## Phase 7: Billing & Account Management

**User stories**: Parents subscribe and pay. Trial period with limits. GDPR data export and account deletion. Transparent pricing.

### What to build

Stripe integration for subscription management. Trial period with card upfront, not charged until trial ends. Usage tracking against plan limits. Billing screen with plan management, payment method, upgrade/downgrade. GDPR-compliant data export (machine-readable format). Full account and data deletion flow. Transparent pricing page showing costs and value.

### Sub-tasks

- [ ] Integrate Stripe — subscription plans, trial with card upfront
- [ ] Implement trial logic — trial period, limits applied, converts to paid on expiry
- [ ] Implement usage tracking against plan limits (messages, children)
- [ ] Build account & billing screen (S14) — plan status, payment, upgrade/downgrade, cancel
- [ ] Implement "cancel subscription" — easy, no dark patterns
- [ ] Implement GDPR data export — generate downloadable export of all data per child
- [ ] Implement account deletion — full data deletion with confirmation
- [ ] Build transparent pricing page — show costs, justify price
- [ ] Build app settings screen (S12) — notification preferences, display settings, legal links
- [ ] Add payment collection to parent registration (S4) — card upfront, trial starts

### Acceptance criteria

- [ ] Parent can sign up for a trial with card details
- [ ] Trial has appropriate limits applied
- [ ] Trial converts to paid subscription after trial period
- [ ] Parent can manage plan, payment method, and cancel easily
- [ ] Parent can export all data for any child (GDPR)
- [ ] Parent can delete their account and all associated data
- [ ] Pricing page clearly shows costs and value

---

## Phase 8: Notifications

**User stories**: Parents receive push notifications for flagged conversations and limit events. Notification preferences are configurable.

### What to build

Web push notification infrastructure for the PWA. Push notifications sent when a conversation is flagged and when a child hits a session limit. Parents configure notification preferences per child and per notification type from app settings.

### Sub-tasks

- [ ] Set up web push notification infrastructure (service worker, VAPID keys)
- [ ] Implement push notification for flagged conversations
- [ ] Implement push notification for session limit reached
- [ ] Build notification preferences in app settings (S12) — per type toggle
- [ ] Implement per-child notification preferences in child settings (S9a)

### Acceptance criteria

- [ ] Parent receives a push notification when a child's conversation is flagged
- [ ] Parent receives a notification when a child hits their session limit
- [ ] Parent can configure which notifications they receive, per type
- [ ] Notifications work on mobile (PWA) and desktop

---

## Phase 9: PWA, Accessibility & Launch Readiness

**User stories**: The app is installable, accessible, secure, and ready for real users.

### What to build

PWA configuration (service worker, manifest, install prompt, offline fallback). WCAG AA accessibility audit and fixes across all screens. Responsive design pass for mobile, tablet, and desktop. Loading states, empty states, and error states. Rate limiting on PIN/password entry. Security audit (encryption, TLS, brute-force protection). Privacy policy and terms of service. End-to-end testing of all critical flows. Red team testing of guardrails. Custom design theme to replace Shadcn defaults.

### Sub-tasks

- [ ] PWA setup — service worker, manifest, install prompt, offline fallback
- [ ] WCAG AA audit — all screens, fix issues
- [ ] Responsive design pass — mobile, tablet, desktop
- [ ] Implement loading states, empty states, error states across all screens
- [ ] Rate limiting and brute-force protection on PIN and password entry
- [ ] Verify encryption at rest (Fly.io Postgres) and TLS on all connections
- [ ] Write privacy policy and terms of service pages
- [ ] Red team guardrails — prompt injection, edge cases, adversarial queries across all presets
- [ ] Evaluate LlamaGuard 4 via OpenRouter as a purpose-built safety classifier — 14 categories including child exploitation (S4), $0.18/M tokens, same OpenRouter infra. Could replace or supplement GPT-4.1-nano validation
- [ ] Content finalisation — calibration questions, system prompts, "Inspire me" pool, intent categories
- [ ] Custom design theme pass — replace Shadcn defaults with product visual identity
- [ ] End-to-end testing: parent signup → onboarding → child login → chat → flag → parent review
- [ ] End-to-end testing: multi-device flows (shared device, child's own device)

### Acceptance criteria

- [ ] App is installable as a PWA on mobile and desktop
- [ ] All screens pass WCAG AA audit
- [ ] All screens work on mobile, tablet, and desktop
- [ ] Every screen has appropriate loading, empty, and error states
- [ ] PIN/password entry has brute-force protection
- [ ] All data is encrypted at rest and in transit
- [ ] Privacy policy and terms of service are published
- [ ] Guardrails withstand adversarial red team testing
- [ ] All content (prompts, calibration, topics) is finalised
- [ ] Visual design is cohesive and not default Shadcn
- [ ] All critical user flows work end-to-end without errors
