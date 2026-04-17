import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { children } from "./children.js";
import { conversations } from "./conversations.js";
import { messages } from "./messages.js";

export const flags = pgTable("flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").references(() => conversations.id, {
    onDelete: "cascade",
  }),
  messageId: uuid("message_id").references(() => messages.id, {
    onDelete: "cascade",
  }),
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
