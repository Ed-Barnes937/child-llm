import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { children } from "./children.js";

export const flags = pgTable("flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "sensitive" | "blocked" | "validation-failed" | "reported"
  reason: text("reason").notNull(),
  childMessage: text("child_message"),
  aiResponse: text("ai_response"),
  topics: text("topics"), // JSON array of detected topic strings
  reviewed: boolean("reviewed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
