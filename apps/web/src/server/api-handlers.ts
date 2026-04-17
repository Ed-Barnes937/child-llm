import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  children,
  devices,
  presets,
  calibrationAnswers,
  conversations,
  messages,
  flags,
} from "@child-safe-llm/db";
import { eq, desc } from "drizzle-orm";
import {
  PRESET_DEFINITIONS,
  type PresetName,
  type PresetSliders,
  type CalibrationAnswer,
  type FlagType,
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

export const handleGetChildConfig = async (childId: string) => {
  const db = getDb();

  const [preset] = await db
    .select()
    .from(presets)
    .where(eq(presets.childId, childId))
    .limit(1);

  const answers = await db
    .select()
    .from(calibrationAnswers)
    .where(eq(calibrationAnswers.childId, childId));

  const defaults = preset
    ? undefined
    : PRESET_DEFINITIONS["confident-reader"].sliders;

  return {
    sliders: preset
      ? {
          vocabularyLevel: preset.vocabularyLevel,
          responseDepth: preset.responseDepth,
          answeringStyle: preset.answeringStyle,
          interactionMode: preset.interactionMode,
          topicAccess: preset.topicAccess,
          sessionLimits: preset.sessionLimits,
          parentVisibility: preset.parentVisibility,
        }
      : defaults,
    calibrationAnswers: answers.map((a) => ({
      questionId: a.questionId,
      selectedLevel: a.selectedLevel,
      customAnswer: a.customAnswer,
    })),
  };
};

export const handleChatStream = async (data: {
  message: string;
  presetName: string;
  sliders?: PresetSliders;
  calibrationAnswers?: CalibrationAnswer[];
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
      sliders: data.sliders,
      calibrationAnswers: data.calibrationAnswers,
      history: data.history,
    }),
  });

  return response;
};

// --- Conversations ---

export const handleCreateConversation = async (data: {
  childId: string;
  title?: string;
}) => {
  const db = getDb();
  const [conversation] = await db
    .insert(conversations)
    .values({
      childId: data.childId,
      title: data.title ?? null,
    })
    .returning();

  return {
    id: conversation.id,
    childId: conversation.childId,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
};

export const handleGetConversations = async (childId: string) => {
  const db = getDb();
  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      summary: conversations.summary,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.childId, childId))
    .orderBy(desc(conversations.updatedAt));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
};

export const handleGetConversationMessages = async (conversationId: string) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversationId,
    role: r.role,
    content: r.content,
    flagged: r.flagged,
    createdAt: r.createdAt.toISOString(),
  }));
};

export const handleSaveMessage = async (
  conversationId: string,
  data: { role: string; content: string; flagged?: boolean },
) => {
  const db = getDb();
  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      role: data.role,
      content: data.content,
      flagged: data.flagged ?? false,
    })
    .returning();

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    flagged: message.flagged,
    createdAt: message.createdAt.toISOString(),
  };
};

export const handleCreateFlag = async (data: {
  childId: string;
  conversationId?: string;
  messageId?: string;
  type: FlagType;
  reason: string;
  childMessage?: string;
  aiResponse?: string;
  topics?: string[];
}) => {
  const db = getDb();
  const [flag] = await db
    .insert(flags)
    .values({
      childId: data.childId,
      conversationId: data.conversationId ?? null,
      messageId: data.messageId ?? null,
      type: data.type,
      reason: data.reason,
      childMessage: data.childMessage ?? null,
      aiResponse: data.aiResponse ?? null,
      topics: data.topics ? JSON.stringify(data.topics) : null,
    })
    .returning();

  return { id: flag.id };
};

// --- Summarisation & Purge ---

export const handleGetConversationSummary = async (conversationId: string) => {
  const db = getDb();
  const [conversation] = await db
    .select({ summary: conversations.summary })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  return { summary: conversation?.summary ?? null };
};

export const handleDeleteConversation = async (conversationId: string) => {
  const db = getDb();
  await db.delete(conversations).where(eq(conversations.id, conversationId));
  return { success: true };
};

export const handleSummariseAndPurge = async (conversationId: string) => {
  const db = getDb();
  const pipelineUrl = process.env.PIPELINE_URL ?? "http://localhost:3001";
  const pipelineKey = process.env.PIPELINE_API_KEY ?? "dev-pipeline-key";

  const rows = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  if (rows.length === 0) {
    const [existing] = await db
      .select({ summary: conversations.summary })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    return { summary: existing?.summary ?? "" };
  }

  const response = await fetch(`${pipelineUrl}/summarise`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pipeline-key": pipelineKey,
    },
    body: JSON.stringify({
      messages: rows.map((r) => ({ role: r.role, content: r.content })),
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate summary");
  }

  const { summary } = (await response.json()) as { summary: string };

  await db
    .update(conversations)
    .set({ summary })
    .where(eq(conversations.id, conversationId));

  await db.delete(messages).where(eq(messages.conversationId, conversationId));

  return { summary };
};
