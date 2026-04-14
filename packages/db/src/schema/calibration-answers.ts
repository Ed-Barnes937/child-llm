import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { children } from "./children.js";

export const calibrationAnswers = pgTable("calibration_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull(),
  selectedLevel: integer("selected_level"), // null when custom answer provided
  customAnswer: text("custom_answer"), // non-null when parent writes their own
});
