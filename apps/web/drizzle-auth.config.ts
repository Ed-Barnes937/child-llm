import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/auth-schema.ts",
  out: "./drizzle-auth",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Only manage Better Auth tables — ignore app tables managed by packages/db
  tablesFilter: ["user", "session", "account", "verification"],
});
