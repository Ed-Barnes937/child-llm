import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { children } from "./children.js";

export const presets = pgTable("presets", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id")
    .notNull()
    .unique()
    .references(() => children.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  vocabularyLevel: integer("vocabulary_level").notNull().default(1),
  responseDepth: integer("response_depth").notNull().default(1),
  answeringStyle: integer("answering_style").notNull().default(1),
  interactionMode: integer("interaction_mode").notNull().default(1),
  topicAccess: integer("topic_access").notNull().default(1),
  sessionLimits: integer("session_limits").notNull().default(3),
  parentVisibility: integer("parent_visibility").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
