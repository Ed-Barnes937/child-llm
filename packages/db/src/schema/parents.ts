import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const parents = pgTable("parents", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  subscriptionStatus: text("subscription_status").default("trial").notNull(),
});
