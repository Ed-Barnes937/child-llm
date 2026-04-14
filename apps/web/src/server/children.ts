import { createServerFn } from "@tanstack/react-start";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { children, presets, calibrationAnswers } from "@child-safe-llm/db";
import { eq } from "drizzle-orm";
import {
  PRESET_DEFINITIONS,
  type PresetName,
  type PresetSliders,
  type CalibrationAnswer,
} from "@child-safe-llm/shared";

const generateUsername = (displayName: string): string => {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}${suffix}`;
};

const getDb = () => {
  const sql = postgres(process.env.DATABASE_URL!);
  return drizzle(sql);
};

export const createChild = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      parentId: string;
      displayName: string;
      presetName: PresetName;
      pin: string;
      sliderOverrides?: Partial<PresetSliders>;
      calibrationAnswers?: CalibrationAnswer[];
    }) => d,
  )
  .handler(async (ctx) => {
    const data = ctx.data;
    const db = getDb();
    const username = generateUsername(data.displayName);

    // For the tracer bullet, child password is same as username (parent will set properly later)
    const tempPassword = username;

    const [child] = await db
      .insert(children)
      .values({
        parentId: data.parentId,
        displayName: data.displayName,
        username,
        passwordHash: tempPassword, // TODO: hash properly
        pinHash: data.pin, // TODO: hash properly
        presetName: data.presetName,
      })
      .returning();

    const defaults = PRESET_DEFINITIONS[data.presetName].sliders;
    const sliders = { ...defaults, ...data.sliderOverrides };
    await db.insert(presets).values({
      childId: child.id,
      name: data.presetName,
      ...sliders,
    });

    if (data.calibrationAnswers && data.calibrationAnswers.length > 0) {
      await db.insert(calibrationAnswers).values(
        data.calibrationAnswers.map((a) => ({
          childId: child.id,
          questionId: a.questionId,
          selectedLevel: a.selectedLevel,
          customAnswer: a.customAnswer,
        })),
      );
    }

    return {
      child: { id: child.id, username, displayName: child.displayName },
    };
  });

export const getChildren = createServerFn({ method: "GET" })
  .inputValidator((d: { parentId: string }) => d)
  .handler(async (ctx) => {
    const data = ctx.data;
    const db = getDb();
    const result = await db
      .select({
        id: children.id,
        displayName: children.displayName,
        username: children.username,
        presetName: children.presetName,
      })
      .from(children)
      .where(eq(children.parentId, data.parentId));

    return result;
  });
