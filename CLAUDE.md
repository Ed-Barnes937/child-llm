# CLAUDE.md

## Project overview

Child-safe LLM — a parent-controlled chat interface for children. Monorepo with a TanStack Start web app (`apps/web`), a Hono pipeline service (`apps/pipeline`), shared packages, and Drizzle ORM for Postgres. See `docs/` for product brief, architecture decisions, and implementation plan.

## Code style

- Always use arrow functions, never function declarations
- Prettier handles formatting; ESLint handles linting
- Pre-commit hooks (husky) run `pnpm typecheck`, `pnpm lint`, and `lint-staged` (Prettier check on staged files)

## Database

### Two Drizzle configs manage separate table sets

- `packages/db/drizzle.config.ts` — app tables (children, devices, presets, calibration_answers, conversations, messages, flags). Uses `tablesFilter` to **exclude** Better Auth tables.
- `apps/web/drizzle-auth.config.ts` — Better Auth tables (user, session, account, verification). Uses `tablesFilter` to **include only** auth tables.

This split exists because Better Auth manages its own schema independently. Do not add auth tables to the db package schema or vice versa.

### Setting up a new database / environment

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL`
2. `pnpm db:push` — creates app tables
3. `pnpm db:auth:push` — creates Better Auth tables

Both commands use `drizzle-kit push` (schema → DB, no migration files). The project does not yet use migration files (`drizzle-kit generate` / `migrate`).

### Better Auth CLI `migrate` does not work with Drizzle adapter

`npx @better-auth/cli migrate` only supports the built-in Kysely adapter. With Drizzle, use `drizzle-kit push` (or generate + migrate) via the separate auth config instead.

### `drizzle-kit push` requires a TTY

If `drizzle-kit push` detects tables in the DB that aren't in its schema (and aren't excluded by `tablesFilter`), it opens an interactive prompt. This fails in non-TTY environments (CI, piped input). Keep `tablesFilter` correct in both configs to avoid this.

## Pipeline service

### Pipeline validates responses before sending them

The pipeline makes a **non-streaming** LLM call, validates the full response (blocklist scan + validation model), then emits the validated response as SSE chunks. This adds latency but ensures nothing reaches the child without passing all safety checks.

### Pipeline does not own the database

The pipeline service has no DB connection. When it detects an issue (sensitive topic, blocklist hit, validation failure), it emits a `flag` event in the SSE stream. The web app is responsible for persisting flags to the `flags` table. Do not add Drizzle or DB dependencies to the pipeline.

### Pipeline env loading

The pipeline uses Node's `--env-file=../../.env` flag (in the dev script) to load environment variables from the monorepo root. It does not use `dotenv`. The web app uses Vite's `loadEnv` in its middleware.

### Pipeline request payload is backwards-compatible

The `/chat` endpoint accepts optional `sliders` and `calibrationAnswers` fields. When omitted, it falls back to the preset's default slider values. The web app does not yet send these — it only sends `presetName`, `message`, and `history`.

### Blocklist uses `obscenity` and `libphonenumber-js`

The output blocklist (`apps/pipeline/src/blocklist.ts`) uses the `obscenity` library for profanity/explicit content detection and `libphonenumber-js` for phone number detection. Hand-rolled regex is only used for dangerous content patterns and URL/email detection.

Key design decisions:

- **Educational terms excluded**: `penis`, `vagina`, and `sex` are removed from `obscenity`'s default dataset. These are legitimate in age-appropriate explanations — the sensitive topics system + validation model handle appropriateness instead.
- **Custom whitelists**: The `obscenity` default dataset doesn't whitelist all common words (e.g. `cockpit`, `cocktail`). These are added as extra whitelisted terms on the matcher. If you encounter new false positives, add them there.
- **Phone number validation is country-aware**: `libphonenumber-js` is configured with `'GB'` as the default country. It correctly ignores postcodes and scientific numbers but won't catch numbers that fail validation against known ranges (e.g. Ofcom reserved ranges).

### Pipeline unit tests use vitest

The pipeline has its own vitest setup (`pnpm --filter @child-safe-llm/pipeline test`). These are fast unit tests for pure functions (prompt builder, blocklist, sensitive topic detection, validation parsing, context anchoring, depth tracking). They are separate from the Playwright CT tests in the web app.

## Conversation persistence

### Messages are saved after streaming completes

The chat page creates a conversation on first message, saves the child's message immediately, then accumulates the AI response from SSE tokens. The full AI message is saved to the DB only after the stream finishes. This avoids partial writes.

### Flags are persisted by the web app, not the pipeline

The pipeline emits `flag` SSE events (sensitive, blocked, validation-failed) but has no DB connection. The web app's chat page receives these events and persists them to the `flags` table via the API. Flags reference their conversation and are linked to the child.

### BackendSimulator chat scenarios are configurable

Use `backendSimulator.db.setChatStreamScenario({ tokens, flag })` to control what the mock chat endpoint returns. If not set, it defaults to the standard "The sun is a big star..." response. Set a `flag` to simulate pipeline guardrail events.

## Testing architecture

Tests use Playwright experimental component testing (`@playwright/experimental-ct-react`), not e2e tests against a running server. Test files use the `.iwft.tsx` extension and live in `apps/web/src/test/flows/`.

### API client layer exists for testability

Route components use plain `fetch()` calls (via `src/api/*.ts`) instead of TanStack Start server functions. This is deliberate — `page.route()` can only intercept network requests, not server function calls. Do not replace the API client layer with server functions.

### BackendSimulator pattern

Tests use a `BackendSimulator` with an in-memory database (`BackendSimulatorDb`) instead of hitting real backends. The simulator intercepts fetch requests via `page.route()` and returns mock responses. Source: `apps/web/src/test/backend-simulator/`.

### TanStack Start `<Scripts>` blocks Playwright CT input

The SSR `<Scripts>` component rendered by the real root route (`__root.tsx`) blocks all Playwright CDP input actions (fill, click, type). This is why `IwftApp.tsx` builds a clean test route tree using `createRootRoute`/`createRoute` without the real root route. Do not try to reuse the production route tree in tests.

### `page.route()` fires in LIFO order

Playwright's route handlers fire last-in-first-out. In `BackendSimulator.install()`, the general `/api` handler is registered first and the more-specific `/api/auth` handler is registered last, so auth routes take priority. If you add new route groups, register them in least-specific to most-specific order.

### BackendSimulator install timing

- **Most tests**: install BackendSimulator _after_ `mount()` — `page.route()` handlers only work reliably after CT mount
- **Exception**: when a component fires API calls during initial render (e.g. PIN login reads device token on mount), install _before_ mount and set up any required localStorage before mount too
- You cannot call `mount()` twice in Playwright CT (React root already exists)

### BackendSimulator supports DELETE routes

The route helper supports GET, POST, and DELETE methods. Use the `del()` helper to define DELETE route handlers.

## Conversation summarisation & retention

### Summarisation flows through the pipeline

The web app owns the database; the pipeline owns LLM calls. To summarise a conversation, the web app fetches messages, sends them to the pipeline's `/summarise` endpoint, stores the returned summary on the conversation record, then deletes the raw messages. The pipeline's `/summarise` endpoint is a simple non-streaming JSON endpoint (not SSE like `/chat`).

### Summary replaces messages after purge

When a conversation has a `summary` but no messages, the `$conversationId` route shows a read-only summary view with a delete button instead of the chat interface. The conversation still appears in the home page list.

### BackendSimulator does not catch real database errors

Because tests use an in-memory mock (`BackendSimulatorDb`) and never connect to Postgres, missing tables, connection failures, and schema mismatches are invisible to the test suite. Always verify new schema changes work against a real database manually or via smoke tests.
