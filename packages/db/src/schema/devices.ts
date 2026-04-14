import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const devices = pgTable("devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: text("parent_id").notNull(),
  deviceToken: text("device_token").notNull().unique(),
  registeredAt: timestamp("registered_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastUsed: timestamp("last_used", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
