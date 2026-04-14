import { defineConfig, devices } from "@playwright/experimental-ct-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.iwft.tsx",
  fullyParallel: true,
  retries: 0,
  workers: undefined,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    ctPort: 3100,
    ctViteConfig: {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          "@": path.resolve(import.meta.dirname, "src"),
        },
      },
    },
  },
});
