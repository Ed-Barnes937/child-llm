# Child Experience

## Core Principle
Safety is why parents buy it. The child's experience is why they keep it. Zero friction to start a conversation.

## Home Screen & Navigation

### Decisions
- Near-zero friction to start chatting — the primary action should be immediately obvious
- Children can see their previous conversations
- Children can customise their page to make it feel like "theirs" (colours, themes, avatar?) — details TBD in design phase
- The home screen experience differs based on the parent's guardrail preset, but exactly how needs deeper exploration in design/UX phase

### Deferred to Design Phase
- How the home screen adapts per preset — younger children may get structured fill-the-gap prompts, older children get something closer to a standard LLM chat
- The tension between "no age tiers" and needing different UX for different capability levels — the preset effectively becomes a UX tier, not just a safety tier

## Conversation UX

### Decisions
- Primary interaction model is **chat-based** — familiar WhatsApp-style UX, same as standard LLMs
- Responses should be shorter and punchier than adult LLM products, calibrated to the vocabulary/depth sliders
- **Rich media available** — images, diagrams alongside text responses. Likely subject to usage limits for cost reasons (image generation is expensive). Details on limits TBD.
- **Voice input/output** — v2 feature. Not in initial launch.
- **Interactive elements in responses** (quizzes, CYOA, polls) — not baked into v1. Children can ask the AI to produce these if their parental controls allow freeform interaction. The AI's capability here is a natural feature of the LLM, not custom UI.

## Conversation Persistence & Privacy

### Decision
- Conversations persist but with a **configurable retention window**
- After the window, conversations are condensed into a **deletable summary**
- Parents can review full conversations for a longer window than the child sees
- Parents configure the timeout before summary generation
- This balances continuity (child can pick up where they left off) with privacy compliance (data isn't stored indefinitely)

### How This Works with Legal Requirements
- Aligns with UK GDPR data minimisation — full transcripts aren't kept forever
- Summaries reduce the data footprint while preserving the parent review feature
- Deletion rights are respected — summaries are deletable
- Parent's review window > child's view window — parents have oversight without indefinite storage

## Journal / Notebook Concept

### Status: Needs further exploration
- Raised as a potential feature for children to save outputs (stories, facts, etc.) — a portfolio of their curiosity
- NOT the primary interaction model — chat is primary
- Could be a secondary feature: "Save this to my notebook" button on any AI response
- Creates something the child can show others — "look what I learned/made"
- Explore further in design phase — is this v1 or v2?

## Proactive Suggestions

### Decision
- The AI can proactively suggest topics via a CTA button — "Inspire me", "Wow me", or similar
- This addresses the "child opens the app without a question in mind" case
- Not a feed or automated suggestions — user-initiated via a button

## Gamification

### Decision
- No gamification features in v1
- No streaks, badges, leaderboards, or pressure mechanics
- Possible v2: weekly roundups of topics explored, "things I've discovered" — but designed carefully to avoid AADC nudge concerns
- The product is a curiosity companion, not a game

## Accessibility

### Decision
- **WCAG AA compliance by default** at launch
- Additional accessibility features (dyslexia fonts, motor accessibility aids, multilingual) can be layered in later

## Session Limits & Wind-Down

### Decision
- Limits are set by parents via guardrail sliders (token limits, depth limits, time limits)
- Children are **warned before hitting a limit** — not abruptly cut off
- The type of warning matches the type of limit (approaching token limit, approaching depth limit on a sensitive topic, etc.)
- Exact UX for the warning/wind-down to be designed later
