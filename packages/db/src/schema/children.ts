import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const children = pgTable("children", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: text("parent_id").notNull(),
  displayName: text("display_name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  pinHash: text("pin_hash"),
  presetName: text("preset_name").notNull().default("early-learner"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
