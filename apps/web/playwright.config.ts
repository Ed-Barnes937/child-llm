import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load monorepo root .env so env vars are available to webServer configs
dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm dev",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      cwd: "../..",
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL!,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
        PIPELINE_URL: process.env.PIPELINE_URL!,
        PIPELINE_API_KEY: process.env.PIPELINE_API_KEY!,
      },
    },
    {
      command: "pnpm dev:pipeline",
      port: 3001,
      reuseExistingServer: !process.env.CI,
      cwd: "../..",
      env: {
        ...process.env,
        PIPELINE_API_KEY: process.env.PIPELINE_API_KEY!,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY!,
      },
    },
  ],
});
