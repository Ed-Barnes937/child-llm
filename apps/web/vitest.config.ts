import { defineConfig } from "vitest/config";

// Unit tests for server-only pure functions (node:crypto, etc.). Kept separate
// from the Playwright component tests (*.iwft.tsx, run via playwright-ct.config).
// This config is used in place of vite.config.ts, so the app's TanStack Start
// plugins are not loaded for these node-environment tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
