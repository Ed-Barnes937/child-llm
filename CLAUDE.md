# CLAUDE.md

## Project overview

Child-safe LLM — a parent-controlled chat interface for children. Monorepo with a TanStack Start web app (`apps/web`), a Hono pipeline service (`apps/pipeline`), shared packages, and Drizzle ORM for Postgres. See `docs/` for product brief, architecture decisions, and implementation plan.

## Code style

- Always use arrow functions, never function declarations
- Prettier handles formatting; ESLint handles linting
- Pre-commit hooks (husky) run `pnpm typecheck`, `pnpm lint`, and `lint-staged` (Prettier check on staged files)

## Database

### Two Drizzle configs manage separate table sets

- `packages/db/drizzle.config.ts` — app tables (children, devices, presets, calibration_answers). Uses `tablesFilter` to **exclude** Better Auth tables.
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

### BackendSimulator does not catch real database errors

Because tests use an in-memory mock (`BackendSimulatorDb`) and never connect to Postgres, missing tables, connection failures, and schema mismatches are invisible to the test suite. Always verify new schema changes work against a real database manually or via smoke tests.
