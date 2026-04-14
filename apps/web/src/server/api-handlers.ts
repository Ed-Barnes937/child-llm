import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { children, devices, presets } from "@child-safe-llm/db";
import { eq } from "drizzle-orm";
import type { PresetName } from "@child-safe-llm/shared";

const getDb = () => {
  const sql = postgres(process.env.DATABASE_URL!);
  return drizzle(sql);
};

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

export const handleCreateChild = async (data: {
  parentId: string;
  displayName: string;
  presetName: PresetName;
  pin: string;
}) => {
  const db = getDb();
  const username = generateUsername(data.displayName);
  const tempPassword = username;

  const [child] = await db
    .insert(children)
    .values({
      parentId: data.parentId,
      displayName: data.displayName,
      username,
      passwordHash: tempPassword,
      pinHash: data.pin,
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
};

export const handleGetChildren = async (parentId: string) => {
  const db = getDb();
  return db
    .select({
      id: children.id,
      displayName: children.displayName,
      username: children.username,
      presetName: children.presetName,
    })
    .from(children)
    .where(eq(children.parentId, parentId));
};

export const handleChildLoginWithPassword = async (data: {
  username: string;
  password: string;
  deviceToken: string;
}) => {
  const db = getDb();
  const [child] = await db
    .select()
    .from(children)
    .where(eq(children.username, data.username))
    .limit(1);

  if (!child) return { error: "Invalid username or password." };
  if (child.passwordHash !== data.password)
    return { error: "Invalid username or password." };

  const [existingDevice] = await db
    .select()
    .from(devices)
    .where(eq(devices.deviceToken, data.deviceToken))
    .limit(1);

  if (!existingDevice) {
    await db.insert(devices).values({
      parentId: child.parentId,
      deviceToken: data.deviceToken,
    });
  }

  return {
    child: {
      id: child.id,
      displayName: child.displayName,
      username: child.username,
      presetName: child.presetName as PresetName,
      parentId: child.parentId,
    },
  };
};

export const handleChildLoginWithPin = async (data: {
  childId: string;
  pin: string;
  deviceToken: string;
}) => {
  const db = getDb();
  const [child] = await db
    .select()
    .from(children)
    .where(eq(children.id, data.childId))
    .limit(1);

  if (!child) return { error: "Child not found." };
  if (child.pinHash !== data.pin) return { error: "Incorrect PIN." };

  return {
    child: {
      id: child.id,
      displayName: child.displayName,
      username: child.username,
      presetName: child.presetName as PresetName,
      parentId: child.parentId,
    },
  };
};

export const handleGetChildrenForDevice = async (deviceToken: string) => {
  const db = getDb();
  const [device] = await db
    .select()
    .from(devices)
    .where(eq(devices.deviceToken, deviceToken))
    .limit(1);

  if (!device) return { children: [] };

  const result = await db
    .select({
      id: children.id,
      displayName: children.displayName,
      presetName: children.presetName,
    })
    .from(children)
    .where(eq(children.parentId, device.parentId));

  return { children: result };
};

export const handleChatStream = async (data: {
  message: string;
  presetName: string;
  history: { role: string; content: string }[];
}) => {
  const pipelineUrl = process.env.PIPELINE_URL ?? "http://localhost:3001";
  const pipelineKey = process.env.PIPELINE_API_KEY ?? "dev-pipeline-key";

  const response = await fetch(`${pipelineUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pipeline-key": pipelineKey,
    },
    body: JSON.stringify({
      message: data.message,
      presetName: data.presetName,
      history: data.history,
    }),
  });

  return response;
};
