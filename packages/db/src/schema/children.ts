import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const children = pgTable("children", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: text("parent_id").notNull(),
  displayName: text("display_name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  pinHash: text("pin_hash"),
  // The child's initial password is its username (a weak default). This flag is
  // set on creation and cleared once the child sets a real password on first
  // login (Phase 6.5.11).
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  presetName: text("preset_name").notNull().default("early-learner"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
