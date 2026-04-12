# Parent Experience

## Core Principle
The parent experience is a control panel and a window into their child's learning. It needs to be trustworthy and effortless. This product empowers children to explore curiosity safely — it is NOT a parenting coach.

## App Architecture: Shared App, Dual Login

### Decision
- Single app for both parents and children
- Shared home page with "Login as parent" or "Login as child" options
- Supports same-device usage (younger child on parent's tablet) and separate-device usage (older child on their own phone)
- Raises interesting technical questions around authentication — where tokens live, session management across shared devices, ensuring a child can't access the parent view, etc. To explore in architecture phase.

## Onboarding

### Decision
- Parent gets an onboarding flow on first login
- Onboarding creates the first child profile (pick a preset, name the child, optional slider tweaks)
- After onboarding, adding additional children is trivial — a simple "add child" action from the dashboard
- Goal: minimal steps from sign-up to the child's first conversation

## Parent Dashboard

### Decision: At-a-Glance Homepage
- The default parent view is a dashboard showing useful info at a glance
- Exact content will fall out naturally during design, but likely includes:
  - Budget/usage remaining
  - Per-child activity summaries (word clouds for topics explored, message counts, etc.)
  - Flagged conversations requiring attention
  - Quick access to child account management

### Multi-Child Management
- Tab per child on the dashboard
- Each child has their own preset, settings, conversation history, and flags
- First child set up during onboarding, additional children added trivially afterwards

## Flagging & Parent Notifications

### Decision
- The AI can flag conversations to parents — not just for sensitive topics, but also when a child isn't getting the answer they want (e.g. the guardrails are preventing a response the child is looking for)
- This helps parents decide whether to adjust their child's settings or have a conversation themselves
- **Explicitly NOT a parenting coach** — no suggested conversation starters, no advice on how to talk to the child. Just surface what happened and let the parent decide.

## Parent-Seeded Inspiration

### Decision
- Parents can seed topics into the child's "Inspire me" button
- e.g. parent adds "The solar system" and the child sees it as a prompt option
- Creates shared engagement without the parent needing to be in the room
- Lightweight, optional feature

## Guardrail Controls

- Accessible from the dashboard but not the primary view
- Set-and-forget by design — presets do the heavy lifting
- Parents can adjust individual sliders per child at any time

## Notification Preferences
- TBD in design phase — likely configurable per child, per notification type
- Flagged conversations are the highest-priority notification

## Privacy & Visibility
- Controlled by the parent's guardrail slider settings per child
- Full conversation review vs. summaries vs. flags only — parent decides based on their child's independence level
- No opinionated nudging from the product on what visibility level to choose

## Admin
- Billing management (upgrade, downgrade, cancel)
- Account management (add/remove children, credentials, etc.)
- Data export (GDPR right — machine-readable export of all child data)
- Account and data deletion

## Deferred to v2
- Daily/weekly digest emails
- Shared discoveries (child shares notebook items with parent)
- Usage trend analytics over time
