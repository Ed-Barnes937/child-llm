import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { children } from "./children.js";

export const parentSeededTopics = pgTable("parent_seeded_topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
