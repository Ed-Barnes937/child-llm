import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  children,
  devices,
  presets,
  calibrationAnswers,
} from "@child-safe-llm/db";
import { eq } from "drizzle-orm";
import {
  PRESET_DEFINITIONS,
  type PresetName,
  type PresetSliders,
  type CalibrationAnswer,
} from "@child-safe-llm/shared";

const getDb = () => {
  const sql = postgres(process.env.DATABASE_URL!);
  return drizzle(sql);
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
  sliderOverrides?: Partial<PresetSliders>;
  calibrationAnswers?: CalibrationAnswer[];
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
