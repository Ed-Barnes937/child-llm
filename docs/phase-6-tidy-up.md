# Phase 6 — Deferred Review Findings

Items not addressed during the per-slice fix passes. To be resolved in a single tidy-up PR after all slices are merged.

---

## 1. Extract shared `ensureOk` helper

**Source:** PRs #9, #10, #11, #12, #13 (raised in every slice)
**Files:** `src/api/children.ts`, `src/api/flags.ts`, `src/api/parent-seeded-topics.ts`, and any other API client files
**What:** Every API client file duplicates the same `if (!res.ok) throw` pattern. Extract to a shared `src/api/fetch-utils.ts` utility.

---

## 2. Topic text has no length constraint

**Source:** PR #9 (schema), PR #10 (handler)
**Files:**
- `packages/db/src/schema/parent-seeded-topics.ts` — `topic` column is unbounded `text()`
- `apps/web/src/server/api-handlers.ts` — `handleCreateParentSeededTopic` does no length validation
**What:** Add a `varchar` limit at the DB level and/or server-side validation (e.g. max 200 chars) to prevent abuse.

---

## 3. Route ordering fragility in auth-middleware.ts

**Source:** PRs #9, #12
**File:** `apps/web/src/lib/auth-middleware.ts`
**What:** The middleware relies on `startsWith` checks evaluated top-to-bottom. A comment explaining the ordering dependency (more-specific routes first) would prevent future breakage.

---

## 4. Flag routes split across two factories

**Source:** PR #9
**Files:** `src/test/backend-simulator/RouteHandlers.testHelper.ts`
**What:** `createFlagRoutes` handles POST while `createParentDashboardRoutes` handles GET and PATCH for flags. Consolidate into one factory for clarity.

---

## 5. In-memory JSON parsing for topic aggregation

**Source:** PR #13
**File:** `apps/web/src/server/api-handlers.ts`
**What:** Topic listing fetches all rows then processes in JS. For now this is fine at small scale, but add a TODO comment noting that DB-level aggregation should replace this if the table grows.

---

## 6. Test coverage gaps in Slice C+D (Flags & Detail)

**Source:** PR #11
**File:** `apps/web/src/test/flows/parent-flags.iwft.tsx`
**What:** Missing tests for:
- Flags with `null` conversationId (no "View" link)
- Correct badge type/colour per flag type (sensitive, blocked, validation-failed)
- Error state when API returns 500
- URL assertion after marking a flag as reviewed

---

## 7. PIN stored as plain text

**Source:** PR #12
**File:** Pre-existing — `packages/db/src/schema/children.ts` (`pinHash` column stores raw PIN)
**What:** Hash PINs with bcrypt/scrypt before storage. This is pre-existing tech debt, not introduced by Phase 6, but was flagged during review.

---

## 8. `evaluate(el => el.click())` workaround in Slice F tests

**Source:** PR #12
**File:** `apps/web/src/test/flows/parent-settings.iwft.tsx`
**What:** Tests use `evaluate(el => el.click())` instead of Playwright's native `click()`. Consider replacing with `click({ force: true })` or investigating why native click doesn't work (likely a Radix overlay issue).
