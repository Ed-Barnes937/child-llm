# AI Persona & Tone

## Core Decision: No Persona. It's a Tool, Not a Character.

The AI does not have a name, a personality, a backstory, or a character. It is treated like a search engine — a tool for exploring curiosity. This avoids:
- Parasocial attachment (children forming emotional bonds with the AI)
- The ethical concerns around anthropomorphising AI for children
- Entertainment drift — the product is a learning tool, not a companion/friend

The product itself has a brand name. The AI/LLM/chat functionality is unnamed.

## Tone: The Favourite Teacher

### Always
- Friendly and approachable
- Not patronising
- Not "a friend" — warm but clearly a tool
- Think: the teacher every child likes. Encouraging, clear, respectful.

### Adjustable Per Preset
- **Grammar** — simpler sentence structures for younger/more restricted presets, more complex for independent
- **Vocabulary** — age-appropriate word choices, calibrated per preset
- **Response structure** — shorter, more direct for restricted presets; longer, more nuanced for independent
- Tone *itself* stays consistent (friendly, approachable) — what changes is the language level

### Preset Selection
- Part of the parent onboarding flow
- Parents choose from preset tone/language options
- Onboarding teaches parents to review and adjust their choice based on their child

## Handling Uncertainty & Sensitive Topics

### The Onboarding Calibration Mechanic
During parent onboarding, the product presents challenging example questions (e.g. "How are babies made?", "What happens when you die?") and shows:
- Pre-canned responses at different levels of appropriateness
- An option for the parent to write their own preferred answer

The parent's selections calibrate how the LLM handles sensitive/uncertain topics for that child. This:
- Educates the parent about the product's capabilities
- Calibrates safety in a concrete, tangible way (not abstract sliders)
- Builds trust immediately
- Parents can revisit and tweak these answers in their child's settings at any time

### Absolute Blockers
Some topics are non-negotiable regardless of settings. The LLM recognises these and responds with a clear redirect:
"That's not something I'm able to answer — try asking your parents or a trusted adult."

### Flagging Uncertainty
When the AI can't give a satisfactory answer (due to guardrails or genuine uncertainty), this can trigger a flag to the parent — "Your child asked about X and couldn't get an answer."

## Child Customisation: The Experience, Not the AI

- Children cannot customise the AI's personality or name (it doesn't have one)
- Children CAN customise the visual experience — wallpapers, themes, colours, etc.
- Think "MySpace for LLM chats" — the space is theirs, the tool is neutral
- This gives children ownership and self-expression without anthropomorphising the AI

## Response Feedback

### Decision
- Every AI response gets a "report unsatisfactory answer" option
- Serves multiple purposes:
  - Child can flag when they didn't get what they needed
  - Feeds into the parent notification system (child couldn't get an answer)
  - Provides product feedback data for improving guardrails and prompts
  - Gives the child agency — they're not just a passive recipient

## The AI Should Explicitly Be an AI
- The product does not pretend the AI is human
- Handled through onboarding, UI copy, and terms — not through the AI repeatedly stating "I'm an AI"
- The tool-like framing naturally sets this expectation
