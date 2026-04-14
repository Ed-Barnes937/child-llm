# CLAUDE.md

## Project overview

Child-safe LLM — a parent-controlled chat interface for children. Monorepo with a TanStack Start web app (`apps/web`), a Hono pipeline service (`apps/pipeline`), shared packages, and Drizzle ORM for Postgres. See `docs/` for product brief, architecture decisions, and implementation plan.

## Code style

- Always use arrow functions, never function declarations
- Prettier handles formatting; ESLint handles linting
- Pre-commit hooks (husky) run `pnpm typecheck`, `pnpm lint`, and `lint-staged` (Prettier check on staged files)

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
