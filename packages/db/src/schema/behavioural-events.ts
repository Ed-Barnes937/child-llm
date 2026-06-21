import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { children } from "./children.js";

// Append-only log of behavioural signals used for rate / velocity / probe
// limiting and basic device reputation (phase 6.5.6). The pipeline owns no DB,
// so this state lives in the web app. Rows are pruned past the retention
// window by the rate-limit layer, so the table stays bounded.
export const behaviouralEvents = pgTable(
  "behavioural_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Nullable: a PIN brute-force attempt has a childId but a chat throttle may
    // be keyed only by device, and vice versa.
    childId: uuid("child_id").references(() => children.id, {
      onDelete: "cascade",
    }),
    deviceToken: text("device_token"),
    kind: text("kind").notNull(), // "message" | "probe" | "rate_violation" | "pin_fail"
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("behavioural_events_child_kind_created_idx").on(
      t.childId,
      t.kind,
      t.createdAt,
    ),
    index("behavioural_events_device_kind_created_idx").on(
      t.deviceToken,
      t.kind,
      t.createdAt,
    ),
  ],
);
