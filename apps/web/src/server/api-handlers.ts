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
  parentSeededTopics,
} from "@child-safe-llm/db";
import { eq, desc, inArray, count } from "drizzle-orm";
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

const getPipelineApiKey = (): string => {
  const key = process.env.PIPELINE_API_KEY;
  if (key) return key;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PIPELINE_API_KEY must be set in production. Refusing to call the pipeline with an insecure default.",
    );
  }
  return "dev-pipeline-key";
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
  const pipelineKey = getPipelineApiKey();

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
  const pipelineKey = getPipelineApiKey();

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
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Pipeline summariser returned ${response.status} ${response.statusText}${
        detail ? `: ${detail}` : ""
      }`,
    );
  }

  const { summary } = (await response.json()) as { summary: string };

  await db.transaction(async (tx) => {
    await tx
      .update(conversations)
      .set({ summary })
      .where(eq(conversations.id, conversationId));

    await tx
      .delete(messages)
      .where(eq(messages.conversationId, conversationId));
  });

  return { summary };
};

// --- Phase 6: Parent Dashboard ---

const verifyChildOwnership = async (
  db: ReturnType<typeof getDb>,
  parentId: string,
  childId: string,
): Promise<boolean> => {
  const [child] = await db
    .select({ parentId: children.parentId })
    .from(children)
    .where(eq(children.id, childId))
    .limit(1);
  return child?.parentId === parentId;
};

export const handleGetFlags = async (parentId: string, childId?: string) => {
  const db = getDb();

  const parentChildren = await db
    .select({ id: children.id, displayName: children.displayName })
    .from(children)
    .where(eq(children.parentId, parentId));

  if (parentChildren.length === 0) return [];

  const parentChildIds = new Set(parentChildren.map((c) => c.id));

  // If childId is provided, verify it belongs to this parent
  if (childId && !parentChildIds.has(childId)) return [];

  const childIds = childId ? [childId] : parentChildren.map((c) => c.id);
  const childNameMap = new Map(
    parentChildren.map((c) => [c.id, c.displayName]),
  );

  const rows = await db
    .select()
    .from(flags)
    .where(inArray(flags.childId, childIds))
    .orderBy(desc(flags.createdAt));

  return rows.map((r) => ({
    id: r.id,
    childId: r.childId,
    conversationId: r.conversationId,
    messageId: r.messageId,
    type: r.type,
    reason: r.reason,
    childMessage: r.childMessage,
    aiResponse: r.aiResponse,
    topics: r.topics,
    reviewed: r.reviewed,
    createdAt: r.createdAt.toISOString(),
    childDisplayName: childNameMap.get(r.childId) ?? "Unknown",
  }));
};

export const handleUpdateFlag = async (
  parentId: string,
  flagId: string,
  data: { reviewed: boolean },
) => {
  const db = getDb();

  // Verify the flag belongs to one of this parent's children
  const [flag] = await db
    .select()
    .from(flags)
    .where(eq(flags.id, flagId))
    .limit(1);
  if (!flag) return null;

  const isOwner = await verifyChildOwnership(db, parentId, flag.childId);
  if (!isOwner) return null;

  const [updated] = await db
    .update(flags)
    .set({ reviewed: data.reviewed })
    .where(eq(flags.id, flagId))
    .returning();

  if (!updated) return null;
  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  };
};

export const handleGetChildStats = async (
  parentId: string,
  childId: string,
) => {
  const db = getDb();

  const isOwner = await verifyChildOwnership(db, parentId, childId);
  if (!isOwner) return null;

  const convos = await db
    .select({ id: conversations.id, updatedAt: conversations.updatedAt })
    .from(conversations)
    .where(eq(conversations.childId, childId));

  const conversationIds = convos.map((c) => c.id);

  let messageCount = 0;
  if (conversationIds.length > 0) {
    const [result] = await db
      .select({ value: count() })
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds));
    messageCount = result?.value ?? 0;
  }

  const childFlags = await db
    .select({ topics: flags.topics, reviewed: flags.reviewed })
    .from(flags)
    .where(eq(flags.childId, childId));

  const topicCounts: Record<string, number> = {};
  for (const f of childFlags) {
    if (f.topics) {
      const parsed = JSON.parse(f.topics) as string[];
      for (const t of parsed) {
        topicCounts[t] = (topicCounts[t] ?? 0) + 1;
      }
    }
  }
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic]) => topic);

  const flagCount = childFlags.filter((f) => !f.reviewed).length;

  const lastActive =
    convos.length > 0
      ? convos
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )[0]
          .updatedAt.toISOString()
      : null;

  return {
    messageCount,
    conversationCount: convos.length,
    topTopics,
    flagCount,
    lastActive,
  };
};

export const handleUpdateChild = async (
  parentId: string,
  childId: string,
  data: { displayName?: string; presetName?: PresetName; pin?: string },
) => {
  const db = getDb();

  const isOwner = await verifyChildOwnership(db, parentId, childId);
  if (!isOwner) return null;

  const updates: Record<string, unknown> = {};
  if (data.displayName !== undefined) updates.displayName = data.displayName;
  if (data.presetName !== undefined) updates.presetName = data.presetName;
  if (data.pin !== undefined) updates.pinHash = data.pin;

  if (Object.keys(updates).length === 0) {
    const [child] = await db
      .select()
      .from(children)
      .where(eq(children.id, childId))
      .limit(1);
    return child
      ? {
          id: child.id,
          displayName: child.displayName,
          username: child.username,
          presetName: child.presetName,
        }
      : null;
  }

  const [child] = await db
    .update(children)
    .set(updates)
    .where(eq(children.id, childId))
    .returning();

  if (!child) return null;
  return {
    id: child.id,
    displayName: child.displayName,
    username: child.username,
    presetName: child.presetName,
  };
};

const ALLOWED_SLIDER_KEYS = new Set([
  "vocabularyLevel",
  "responseDepth",
  "answeringStyle",
  "interactionMode",
  "topicAccess",
  "sessionLimits",
  "parentVisibility",
]);

export const handleUpdatePreset = async (
  parentId: string,
  childId: string,
  sliders: Partial<PresetSliders>,
) => {
  const db = getDb();

  const isOwner = await verifyChildOwnership(db, parentId, childId);
  if (!isOwner) return null;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(sliders)) {
    if (ALLOWED_SLIDER_KEYS.has(key)) {
      updates[key] = value;
    }
  }

  const [preset] = await db
    .update(presets)
    .set(updates)
    .where(eq(presets.childId, childId))
    .returning();

  if (!preset) return null;
  return {
    sliders: {
      vocabularyLevel: preset.vocabularyLevel,
      responseDepth: preset.responseDepth,
      answeringStyle: preset.answeringStyle,
      interactionMode: preset.interactionMode,
      topicAccess: preset.topicAccess,
      sessionLimits: preset.sessionLimits,
      parentVisibility: preset.parentVisibility,
    },
  };
};

export const handleUpdateCalibration = async (
  parentId: string,
  childId: string,
  answers: CalibrationAnswer[],
) => {
  const db = getDb();

  const isOwner = await verifyChildOwnership(db, parentId, childId);
  if (!isOwner) return null;

  return db.transaction(async (tx) => {
    await tx
      .delete(calibrationAnswers)
      .where(eq(calibrationAnswers.childId, childId));

    if (answers.length > 0) {
      await tx.insert(calibrationAnswers).values(
        answers.map((a) => ({
          childId,
          questionId: a.questionId,
          selectedLevel: a.selectedLevel,
          customAnswer: a.customAnswer,
        })),
      );
    }

    const rows = await tx
      .select()
      .from(calibrationAnswers)
      .where(eq(calibrationAnswers.childId, childId));

    return {
      calibrationAnswers: rows.map((a) => ({
        questionId: a.questionId,
        selectedLevel: a.selectedLevel,
        customAnswer: a.customAnswer,
      })),
    };
  });
};

export const handleGetParentSeededTopics = async (
  parentId: string,
  childId: string,
) => {
  const db = getDb();

  const isOwner = await verifyChildOwnership(db, parentId, childId);
  if (!isOwner) return null;

  const rows = await db
    .select()
    .from(parentSeededTopics)
    .where(eq(parentSeededTopics.childId, childId))
    .orderBy(desc(parentSeededTopics.createdAt));

  return rows.map((r) => ({
    id: r.id,
    childId: r.childId,
    topic: r.topic,
    createdAt: r.createdAt.toISOString(),
  }));
};

export const handleCreateParentSeededTopic = async (
  parentId: string,
  childId: string,
  topic: string,
) => {
  const db = getDb();

  const isOwner = await verifyChildOwnership(db, parentId, childId);
  if (!isOwner) return null;

  const [row] = await db
    .insert(parentSeededTopics)
    .values({ childId, topic })
    .returning();

  return {
    id: row.id,
    childId: row.childId,
    topic: row.topic,
    createdAt: row.createdAt.toISOString(),
  };
};

export const handleDeleteParentSeededTopic = async (
  parentId: string,
  childId: string,
  topicId: string,
) => {
  const db = getDb();

  const isOwner = await verifyChildOwnership(db, parentId, childId);
  if (!isOwner) return null;

  await db.delete(parentSeededTopics).where(eq(parentSeededTopics.id, topicId));
  return { success: true };
};
