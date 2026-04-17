# Tech Stack Decisions

## Status: Light commitments — revisit during implementation if needed

## Architecture: TanStack Start + Dedicated Pipeline Service

### TanStack Start (Frontend + App Server)
- **Framework:** TanStack Start (v1.0+) — full-stack React framework
- **Routing:** TanStack Router (type-safe, compile-time checked)
- **Data fetching:** TanStack Query (first-class integration)
- **Server functions:** Handle auth, CRUD, settings, dashboard data, conversation history
- **Deployment:** Vercel (or Cloudflare Workers)
- **Styling:** TBD (Tailwind likely)

### Dedicated Pipeline Service (LLM + Guardrails)
- **Purpose:** Handles the complex, long-running guardrails pipeline — prompt building, LLM calls, output filtering, validation, flagging
- **Framework:** Hono — tiny, TypeScript-native, clean streaming support
- **Deployment:** Railway or Fly.io (needs long-running process support, not serverless)
- **Communication:** Called by TanStack Start server functions, not directly by the client
- **Auth:** Shared API key via environment variables. Pipeline service not exposed to public internet (private networking where available).
- **Streaming:** SSE from pipeline service → TanStack Start → client

### Why This Split
- TanStack Start gives the best DX for 80% of the app (auth, CRUD, settings, dashboard)
- The guardrails pipeline needs full control over execution time, streaming, and multi-step processing — doesn't fit well in serverless functions
- Two deployments, but the second is a focused single-purpose service
- Pipeline service is independently scalable if needed

## Hosting: Fly.io — Everything in One Platform

### Decision
All services hosted on Fly.io, London region (UK data residency).

- **TanStack Start app** — containerised, deployed to Fly.io London
- **Pipeline service** — containerised, deployed to Fly.io London
- **PostgreSQL** — Fly.io managed Postgres, London region
- **Private networking** — pipeline service and DB not exposed to the internet, communicate over Fly's internal network

### Why Fly.io
- One platform, one CLI, one dashboard, one billing — minimises context-switching for a solo developer
- UK region available — simplifies AADC/GDPR compliance for children's data
- Docker-based — founder uses Docker daily, zero learning curve
- Free tier covers development (3 shared VMs, 1GB storage, 160GB transfer)
- Launch budget ~£20/mo (app ~$5 + pipeline ~$5 + Postgres ~$7)
- Scales when needed without platform migration

### What We Lose vs Alternatives
- No automatic PR preview deployments (Vercel's strength) — manageable for a solo dev
- No DB branching (Neon's strength) — single dev DB + production DB is sufficient

### Database
- **PostgreSQL** on Fly.io managed Postgres
- **ORM:** Drizzle — schema and migrations managed from the monorepo
- **Data residency:** London region, UK-hosted

### Auth
- **Parent auth:** Better Auth — batteries-included, Drizzle adapter, self-hosted, stores in our DB
- **Child auth:** Custom application logic (username + password for new devices, PIN for known devices)
- See [01-auth-model.md](01-auth-model.md) for full auth model

### ORM
- **Drizzle** — DB managed from within the monorepo

### Styling
- **Tailwind CSS** for utility-first styling
- **Shadcn/ui** as the structural component base (copy-paste model — we own the code)
- Built on Radix primitives — strong accessibility foundation for WCAG AA
- **Custom theme pass before launch** — colour palette, typography, border radii, spacing, animation language. The goal is warm and trustworthy, not clinical SaaS.
- Child-facing UI will need additional custom styling on top — no library ships "playful UI for children"
- Shadcn defaults are fine during development for speed — the skin is replaced before launch

### LLM Provider & Models
- **Provider:** OpenRouter — no markup over direct pricing, one API for all providers, fallback routing, future auto-routing for V2
- **Primary model (V1):** GPT-4o-mini via OpenRouter ($0.15 / $0.60 per 1M input/output tokens). Strong instruction following, proven for tone adjustment.
- **Validation model (V1):** GPT-4.1 nano via OpenRouter ($0.10 / $0.20 per 1M tokens). Cheapest option, sufficient for "is this appropriate?" classification.
- **V2:** Enable OpenRouter auto-routing — simple queries hit cheap models, complex ones hit better models. No code change required.
- **Estimated cost per message:** ~$0.00025 (~£0.20 per 1,000 messages). A child sending 50 messages/day costs ~£0.30/month in API.

## Tech Stack Summary

| Layer | Choice |
|---|---|
| Frontend framework | TanStack Start (React) |
| Routing | TanStack Router |
| Data fetching | TanStack Query |
| Styling | Tailwind CSS + Shadcn/ui (custom theme before launch) |
| Auth (parent) | Better Auth (Drizzle adapter, self-hosted) |
| Auth (child) | Custom (username + password / PIN) |
| ORM | Drizzle |
| Database | PostgreSQL on Fly.io (London) |
| Pipeline service | Hono (TypeScript) |
| Content moderation | obscenity (profanity/slur detection), libphonenumber-js (phone number detection) |
| LLM provider | OpenRouter (GPT-4o-mini primary, GPT-4.1 nano validation) |
| Hosting | Fly.io — all services in London region |
| E2E testing | Playwright |

### Testing
- **E2E / Integration:** Playwright — browser-based tests for critical user flows. Runs against the full stack (both services + DB).
- **Strategy:** Each phase includes Playwright tests for the flows it introduces. Tests cover the happy path and key edge cases (auth failures, empty states, error handling). Not aiming for full coverage — testing the flows that cross multiple layers (auth → DB, chat → pipeline → streaming) catches the highest-value bugs.
- **CI:** Playwright tests run in GitHub Actions on PR alongside lint + typecheck.

All decisions are light commitments — revisitable during implementation.
