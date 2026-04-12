# Screen Map

## Overview

This document maps every screen in the app, what's on it, and how screens connect. The app serves two user types (parent and child) from a single app with a shared entry point.

---

## Shared Screens

### S1: Login / Landing Page
**Purpose:** Entry point. Choose who's logging in.
**Elements:**
- Product logo / branding
- "I'm a parent" button → S2 (Parent Login)
- "I'm a child" button → S3 (Child Login)
- "Sign up" link → S4 (Parent Registration)

**Notes:**
- This is the first thing anyone sees. Needs to feel safe, trustworthy, and simple.
- No account creation for children — only parents can create accounts.
- Need to consider: how do we prevent a child from tapping "I'm a parent"? PIN/password is the main gate, but the UX should gently guide rather than tempt.

---

## Parent Screens

### S2: Parent Login
**Purpose:** Authenticate the parent.
**Elements:**
- Email + password fields
- "Forgot password" link
- "Log in" button
- "Back" to S1

### S4: Parent Registration
**Purpose:** New parent creates an account.
**Elements:**
- Email, password, confirm password
- Payment details (serves as identity verification + billing setup)
- Terms of service / privacy policy acceptance
- "Create account" button → S5 (Parent Onboarding)

**Notes:**
- Payment at registration doubles as verifiable parental consent (relevant for COPPA if US users arrive).
- Trial accounts still require payment details upfront (card collected, not charged until trial ends). This also serves as identity verification.

### S5: Parent Onboarding — Step 1: Create First Child
**Purpose:** Set up the first child account.
**Elements:**
- Child's display name input
- Preset selector — visual cards for each preset (e.g. "Early learner", "Confident reader", "Independent explorer") with brief descriptions
- "Next" button → S6

**Notes:**
- Keep this fast. One screen, two inputs. The parent wants their child using the app, not filling forms.

### S6: Parent Onboarding — Step 2: Calibration
**Purpose:** Calibrate how the AI handles sensitive topics for this child.
**Elements:**
- A series of challenging example questions (e.g. "How are babies made?", "What happens when you die?")
- For each: 2-3 pre-canned answer options at different appropriateness levels + "Write your own" option
- "Next" button → S7
- "Skip" option (applies sensible defaults)

**Notes:**
- This is a distinctive product feature. It educates the parent AND calibrates the system.
- Don't overwhelm — 3-5 example questions max. Can always be revisited later.
- The skip option is important — some parents will want to get going and tweak later.

### S7: Parent Onboarding — Step 3: Review & Finish
**Purpose:** Confirm the child's setup before launching.
**Elements:**
- Summary: child name, preset chosen, calibration choices
- "Edit" links to go back and change anything
- Option to customise individual sliders (collapsed/advanced by default)
- "Create [child name]'s account" button → S8

### S8: Parent Dashboard
**Purpose:** The parent's home screen. At-a-glance overview of all children.
**Elements:**
- **Tab bar** — one tab per child (first child selected by default)
- **Per-child summary panel:**
  - Usage stats (messages today, budget/credit remaining)
  - Topic word cloud or topic list (what they've been exploring)
  - Flagged conversations count / alert (tappable → S10)
  - Recent conversations list (tappable → S11)
- **Quick actions:**
  - "Add child" → S5 (reuse onboarding flow)
  - "Settings" → S12
- **Navigation:**
  - Dashboard (current)
  - Child management → S9
  - Account / Billing → S14
  - Notifications (bell icon with badge) → S10

**Notes:**
- This is the screen parents see 90% of the time. Must surface the important stuff immediately.
- Word cloud / topic summary is the "feel good" element — "my child learned about X today."

### S9: Child Management
**Purpose:** View and manage all child accounts.
**Elements:**
- List of child accounts with name, preset label, last active
- Tap a child → S9a (Child Settings)
- "Add child" button → S5

### S9a: Child Settings
**Purpose:** Configure a specific child's experience.
**Elements:**
- **Preset section** — current preset shown, option to change
- **Slider controls** — all configurable dimensions (vocabulary, response depth, answering style, interaction mode, topic access, session limits, parent visibility)
- **Calibration answers** — review/edit the sensitive topic calibration from onboarding
- **Inspire me topics** — parent can add/remove seeded topics
- **Intent categories** — configure which structured prompt categories the child sees (for restricted presets)
- **PIN management** — view or reset the child's PIN
- **Data management** — conversation retention window setting, delete conversation history, export data
- "Save" / "Done"

### S10: Flagged Conversations
**Purpose:** Review conversations the AI flagged for parent attention.
**Elements:**
- List of flagged items, most recent first
- Each item shows: child name, date/time, topic/trigger, flag reason (sensitive topic / child couldn't get answer / child reported unsatisfactory answer)
- Tap an item → S11 (Conversation Detail) scrolled to the flagged exchange
- Mark as reviewed / dismiss

### S11: Conversation Detail
**Purpose:** Read a full conversation transcript.
**Elements:**
- Chat-style view of the conversation (read-only)
- Flagged messages highlighted
- Child's display name + AI responses
- Date/time stamps
- "Back" to dashboard or flagged list

**Notes:**
- Only available within the parent's configured retention window.
- After retention window: only the summary is available, not the full transcript.

### S12: App Settings
**Purpose:** Global app settings (not per-child).
**Elements:**
- Notification preferences (per type: flags, limits reached). Digest emails added in V2.
- Display preferences
- "About" / legal links

### S13: Conversation Summary
**Purpose:** View the condensed summary of an expired conversation.
**Elements:**
- AI-generated summary of topics covered
- Date range
- Any flags that were raised
- "Delete summary" button

### S14: Account & Billing
**Purpose:** Manage subscription and account.
**Elements:**
- Current plan / subscription status
- Usage / budget overview (across all children)
- Upgrade / downgrade plan
- Payment method management
- Top-up option (if budget model)
- Export all data (GDPR)
- Delete account (with clear warnings)
- "Cancel subscription" — easy to find, no dark patterns

---

## Child Screens

### S3: Child Login
**Purpose:** Child selects their profile and enters the app.
**Elements:**
- List of child profiles on this device (avatar/name cards)
- Child taps their name → PIN entry → S20

**Notes:**
- Should feel friendly and visual — large cards/avatars, minimal text.
- Child sets their own PIN (gives them ownership of their space).
- Parents can view/reset any child's PIN from child settings (S9a).
- Simple 4-digit PIN — this is about sibling privacy, not high security.

### S20: Child Home / Chat List
**Purpose:** The child's main screen. Start chatting or continue a conversation.
**Elements:**
- **New conversation button** (prominent) → S21
- **"Inspire me" button** → generates a topic suggestion (from AI pool + parent-seeded topics)
- **Previous conversations list** — recent chats with topic/title, tappable → S21
- **Customisation access** — button/icon to personalise their space → S23 *(V1.5)*

**Notes:**
- Must be near-zero friction to start chatting.
- For restricted presets: the "new conversation" flow may go through intent selection first (S21a) rather than straight to freeform chat.
- V1: default theme/styling. V1.5: home screen adapts based on the child's customisation choices (wallpaper, theme, colours).

### S21: Chat / Conversation
**Purpose:** The core experience. Child chats with the AI.
**Elements:**
- **Chat messages** — WhatsApp-style bubbles. Text-only for V1 (rich media in V2).
- **Input area:**
  - Text input field
  - Send button
  - "Inspire me" button (smaller, beside input)
- **Per-message actions:**
  - "Report unsatisfactory answer" button/icon on each AI response
- **Session limit warning** — appears inline when approaching a limit (token, depth, time). Gentle, not alarming.

**Notes:**
- Responses are shorter and punchier than adult LLM products, calibrated to the preset.
- Text-only for V1. Rich media (images/diagrams) added in V2.
- The "report" action feeds into the parent flagging system.

### S21a: Intent Selection (Restricted Presets Only)
**Purpose:** Structured entry point for children on more restricted presets.
**Elements:**
- Visual cards/buttons for intent categories:
  - "I want to learn about..."
  - "Help me with my homework..."
  - "Let's write a story about..."
  - Additional categories as configured by parent
- Tapping a card → S21 with the intent pre-filled or a follow-up prompt ("What do you want to learn about?")

**Notes:**
- Only shown for presets where interaction mode is set toward "structured."
- Freeform presets skip this and go straight to S21.
- Categories are parent-configurable from child settings (S9a). Sensible defaults provided.

### S22: Conversation History
**Purpose:** Browse past conversations.
**Elements:**
- List of previous conversations with title/topic and date
- Conversations within retention window are tappable → S21 (continue or review)
- Expired conversations show as summaries only

**Notes:**
- Retention window is parent-configured. Child sees conversations for a shorter window than the parent.

### S23: Customise My Space *(V1.5)*
**Purpose:** Let the child make the app feel like theirs.
**Elements:**
- Wallpaper / background picker
- Theme / colour scheme selector
- Avatar customisation (if applicable)
- Preview of changes
- "Save"

**Notes:**
- "MySpace for LLM chats" — self-expression without anthropomorphising the AI.
- Keep options fun but not overwhelming.
- Deferred to V1.5 — not blocking for launch but important for engagement.

---

## Screen Flow Summary

```
S1 (Landing)
├── "I'm a parent" → S2 (Login) → S8 (Dashboard)
├── "I'm a child" → S3 (Child Login) → S20 (Child Home)
└── "Sign up" → S4 (Registration) → S5-S7 (Onboarding) → S8 (Dashboard)

Parent flows from Dashboard (S8):
├── Tab per child → summary panel
├── Flagged alert → S10 (Flags) → S11 (Conversation Detail)
├── Recent conversation → S11
├── Child management → S9 → S9a (Child Settings)
├── Add child → S5 (Onboarding reuse)
├── Settings → S12
└── Account/Billing → S14

Child flows from Home (S20):
├── New conversation → S21a (Intent, if restricted) → S21 (Chat)
├── "Inspire me" → topic suggestion → S21 (Chat)
├── Previous conversation → S21 (Chat, continued)
├── Conversation history → S22
└── Customise → S23
```
