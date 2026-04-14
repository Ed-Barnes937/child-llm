import { createServerFn } from "@tanstack/react-start";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { children, presets } from "@child-safe-llm/db";
import { eq } from "drizzle-orm";
import type { PresetName } from "@child-safe-llm/shared";

const PRESET_DEFAULTS: Record<
  PresetName,
  {
    vocabularyLevel: number;
    responseDepth: number;
    answeringStyle: number;
    interactionMode: number;
    topicAccess: number;
    sessionLimits: number;
    parentVisibility: number;
  }
> = {
  "early-learner": {
    vocabularyLevel: 1,
    responseDepth: 1,
    answeringStyle: 1,
    interactionMode: 1,
    topicAccess: 1,
    sessionLimits: 2,
    parentVisibility: 5,
  },
  "confident-reader": {
    vocabularyLevel: 3,
    responseDepth: 3,
    answeringStyle: 3,
    interactionMode: 3,
    topicAccess: 3,
    sessionLimits: 3,
    parentVisibility: 3,
  },
  "independent-explorer": {
    vocabularyLevel: 5,
    responseDepth: 5,
    answeringStyle: 5,
    interactionMode: 5,
    topicAccess: 5,
    sessionLimits: 5,
    parentVisibility: 1,
  },
};

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

    const defaults = PRESET_DEFAULTS[data.presetName];
    await db.insert(presets).values({
      childId: child.id,
      name: data.presetName,
      ...defaults,
    });

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
