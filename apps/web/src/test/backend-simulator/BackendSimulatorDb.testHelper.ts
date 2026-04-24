import { EndpointBehaviourManager } from "./EndpointBehaviourManager.testHelper";
import {
  PRESET_DEFINITIONS,
  type PresetName,
  type CalibrationAnswer,
  type FlagType,
} from "@child-safe-llm/shared";

export interface MockParent {
  id: string;
  name: string;
  email: string;
  password: string;
}

export interface MockChild {
  id: string;
  parentId: string;
  displayName: string;
  username: string;
  passwordHash: string;
  pinHash: string;
  presetName: PresetName;
}

export interface MockDevice {
  parentId: string;
  deviceToken: string;
}

export interface MockSession {
  userId: string;
  token: string;
}

export interface MockConversation {
  id: string;
  childId: string;
  title: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  flagged: boolean;
  createdAt: string;
}

export interface MockFlag {
  id: string;
  childId: string;
  conversationId: string | null;
  messageId: string | null;
  type: FlagType;
  reason: string;
  childMessage: string | null;
  aiResponse: string | null;
  topics: string | null;
  reviewed: boolean;
  createdAt: string;
}

let nextId = 1;
const generateId = (): string => `mock-id-${nextId++}`;

export interface MockCalibrationAnswer {
  childId: string;
  questionId: string;
  selectedLevel: number | null;
  customAnswer: string | null;
}

export interface MockParentSeededTopic {
  id: string;
  childId: string;
  topic: string;
  createdAt: string;
}

export interface ChatStreamScenario {
  tokens: string[];
  flag?: {
    type: "sensitive" | "blocked" | "validation-failed";
    reason: string;
    topics?: string[];
    childMessage: string;
    aiResponse?: string;
  };
}

export class BackendSimulatorDb {
  readonly endpointBehaviourManager = new EndpointBehaviourManager();
  readonly parents: MockParent[] = [];
  readonly sessions: MockSession[] = [];
  readonly children: MockChild[] = [];
  readonly deviceList: MockDevice[] = [];
  readonly calibrationAnswersList: MockCalibrationAnswer[] = [];
  readonly conversationsList: MockConversation[] = [];
  readonly messagesList: MockMessage[] = [];
  readonly flagsList: MockFlag[] = [];
  readonly parentSeededTopicsList: MockParentSeededTopic[] = [];
  private chatStreamScenario: ChatStreamScenario | null = null;

  createParent = (data: {
    name: string;
    email: string;
    password: string;
  }): MockParent => {
    const parent: MockParent = { id: generateId(), ...data };
    this.parents.push(parent);
    return parent;
  };

  createSession = (userId: string): MockSession => {
    const session: MockSession = {
      userId,
      token: `session-${generateId()}`,
    };
    this.sessions.push(session);
    return session;
  };

  findParentByEmail = (email: string): MockParent | undefined => {
    return this.parents.find((p) => p.email === email);
  };

  findSessionByToken = (token: string): MockSession | undefined => {
    return this.sessions.find((s) => s.token === token);
  };

  removeSession = (token: string): void => {
    const idx = this.sessions.findIndex((s) => s.token === token);
    if (idx !== -1) this.sessions.splice(idx, 1);
  };

  createChild = (data: {
    parentId: string;
    displayName: string;
    presetName: PresetName;
    pin: string;
  }): MockChild => {
    const base = data.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 10);
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const username = `${base}${suffix}`;

    const child: MockChild = {
      id: generateId(),
      parentId: data.parentId,
      displayName: data.displayName,
      username,
      passwordHash: username, // tracer bullet: password = username
      pinHash: data.pin,
      presetName: data.presetName,
    };
    this.children.push(child);
    return child;
  };

  getChildrenByParent = (parentId: string): MockChild[] => {
    return this.children.filter((c) => c.parentId === parentId);
  };

  findChildByUsername = (username: string): MockChild | undefined => {
    return this.children.find((c) => c.username === username);
  };

  findChildById = (id: string): MockChild | undefined => {
    return this.children.find((c) => c.id === id);
  };

  registerDevice = (parentId: string, deviceToken: string): void => {
    const exists = this.deviceList.find((d) => d.deviceToken === deviceToken);
    if (!exists) {
      this.deviceList.push({ parentId, deviceToken });
    }
  };

  getChildrenByDevice = (deviceToken: string): MockChild[] => {
    const device = this.deviceList.find((d) => d.deviceToken === deviceToken);
    if (!device) return [];
    return this.children.filter((c) => c.parentId === device.parentId);
  };

  storeCalibrationAnswers = (
    childId: string,
    answers: CalibrationAnswer[],
  ): void => {
    for (const a of answers) {
      this.calibrationAnswersList.push({
        childId,
        questionId: a.questionId,
        selectedLevel: a.selectedLevel,
        customAnswer: a.customAnswer,
      });
    }
  };

  getCalibrationAnswers = (childId: string): MockCalibrationAnswer[] => {
    return this.calibrationAnswersList.filter((a) => a.childId === childId);
  };

  // --- Conversations ---

  setChatStreamScenario = (scenario: ChatStreamScenario): void => {
    this.chatStreamScenario = scenario;
  };

  getChatStreamScenario = (): ChatStreamScenario | null => {
    return this.chatStreamScenario;
  };

  createConversation = (data: {
    childId: string;
    title?: string;
    summary?: string;
  }): MockConversation => {
    const now = new Date().toISOString();
    const conversation: MockConversation = {
      id: generateId(),
      childId: data.childId,
      title: data.title ?? null,
      summary: data.summary ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.conversationsList.push(conversation);
    return conversation;
  };

  getConversationsByChild = (childId: string): MockConversation[] => {
    return this.conversationsList
      .filter((c) => c.childId === childId)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  };

  getMessagesByConversation = (conversationId: string): MockMessage[] => {
    return this.messagesList
      .filter((m) => m.conversationId === conversationId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  };

  saveMessage = (data: {
    conversationId: string;
    role: string;
    content: string;
    flagged?: boolean;
  }): MockMessage => {
    const message: MockMessage = {
      id: generateId(),
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      flagged: data.flagged ?? false,
      createdAt: new Date().toISOString(),
    };
    this.messagesList.push(message);

    const conversation = this.conversationsList.find(
      (c) => c.id === data.conversationId,
    );
    if (conversation) {
      conversation.updatedAt = new Date().toISOString();
    }

    return message;
  };

  getConversationSummary = (conversationId: string): string | null => {
    const conversation = this.conversationsList.find(
      (c) => c.id === conversationId,
    );
    return conversation?.summary ?? null;
  };

  deleteConversation = (conversationId: string): void => {
    const idx = this.conversationsList.findIndex(
      (c) => c.id === conversationId,
    );
    if (idx !== -1) this.conversationsList.splice(idx, 1);
    // Also remove associated messages
    for (let i = this.messagesList.length - 1; i >= 0; i--) {
      if (this.messagesList[i].conversationId === conversationId) {
        this.messagesList.splice(i, 1);
      }
    }
  };

  summariseAndPurge = (conversationId: string): string => {
    const conversation = this.conversationsList.find(
      (c) => c.id === conversationId,
    );
    if (!conversation) return "";

    const msgs = this.getMessagesByConversation(conversationId);
    const summary =
      msgs.length > 0
        ? `Summary of ${msgs.length} messages about "${conversation.title ?? "untitled"}".`
        : (conversation.summary ?? "");

    conversation.summary = summary;

    // Purge messages
    for (let i = this.messagesList.length - 1; i >= 0; i--) {
      if (this.messagesList[i].conversationId === conversationId) {
        this.messagesList.splice(i, 1);
      }
    }

    return summary;
  };

  getChildConfig = (childId: string) => {
    const child = this.findChildById(childId);
    const sliders = child
      ? PRESET_DEFINITIONS[child.presetName].sliders
      : PRESET_DEFINITIONS["confident-reader"].sliders;
    const answers = this.getCalibrationAnswers(childId);
    return {
      sliders,
      calibrationAnswers: answers.map((a) => ({
        questionId: a.questionId,
        selectedLevel: a.selectedLevel,
        customAnswer: a.customAnswer,
      })),
    };
  };

  createFlag = (data: {
    childId: string;
    conversationId?: string;
    messageId?: string;
    type: FlagType;
    reason: string;
    childMessage?: string;
    aiResponse?: string;
    topics?: string[];
  }): MockFlag => {
    const flag: MockFlag = {
      id: generateId(),
      childId: data.childId,
      conversationId: data.conversationId ?? null,
      messageId: data.messageId ?? null,
      type: data.type,
      reason: data.reason,
      childMessage: data.childMessage ?? null,
      aiResponse: data.aiResponse ?? null,
      topics: data.topics ? JSON.stringify(data.topics) : null,
      reviewed: false,
      createdAt: new Date().toISOString(),
    };
    this.flagsList.push(flag);
    return flag;
  };

  // --- Phase 6: Parent Dashboard ---

  getFlagsByParent = (parentId: string, childId?: string): MockFlag[] => {
    const parentChildIds = new Set(
      this.children.filter((c) => c.parentId === parentId).map((c) => c.id),
    );
    return this.flagsList
      .filter(
        (f) =>
          parentChildIds.has(f.childId) && (!childId || f.childId === childId),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  };

  updateFlagReviewed = (flagId: string, reviewed: boolean): MockFlag | null => {
    const flag = this.flagsList.find((f) => f.id === flagId);
    if (!flag) return null;
    flag.reviewed = reviewed;
    return flag;
  };

  getChildStats = (
    childId: string,
  ): {
    messageCount: number;
    conversationCount: number;
    topTopics: string[];
    flagCount: number;
    lastActive: string | null;
  } => {
    const conversations = this.conversationsList.filter(
      (c) => c.childId === childId,
    );
    const conversationIds = new Set(conversations.map((c) => c.id));
    const messageCount = this.messagesList.filter((m) =>
      conversationIds.has(m.conversationId),
    ).length;

    const topicCounts: Record<string, number> = {};
    for (const flag of this.flagsList.filter((f) => f.childId === childId)) {
      if (flag.topics) {
        const topics = JSON.parse(flag.topics) as string[];
        for (const t of topics) {
          topicCounts[t] = (topicCounts[t] ?? 0) + 1;
        }
      }
    }
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic]) => topic);

    const flagCount = this.flagsList.filter(
      (f) => f.childId === childId && !f.reviewed,
    ).length;

    const lastActive =
      conversations.length > 0
        ? conversations.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )[0].updatedAt
        : null;

    return {
      messageCount,
      conversationCount: conversations.length,
      topTopics,
      flagCount,
      lastActive,
    };
  };

  updateChild = (
    childId: string,
    data: { displayName?: string; presetName?: PresetName; pin?: string },
  ): MockChild | null => {
    const child = this.children.find((c) => c.id === childId);
    if (!child) return null;
    if (data.displayName !== undefined) child.displayName = data.displayName;
    if (data.presetName !== undefined) child.presetName = data.presetName;
    if (data.pin !== undefined) child.pinHash = data.pin;
    return child;
  };

  updatePreset = (
    childId: string,
    sliders: Record<string, number>,
  ): Record<string, number> => {
    const child = this.findChildById(childId);
    const defaults = child
      ? PRESET_DEFINITIONS[child.presetName].sliders
      : PRESET_DEFINITIONS["confident-reader"].sliders;
    return { ...defaults, ...sliders };
  };

  updateCalibration = (childId: string, answers: CalibrationAnswer[]): void => {
    for (let i = this.calibrationAnswersList.length - 1; i >= 0; i--) {
      if (this.calibrationAnswersList[i].childId === childId) {
        this.calibrationAnswersList.splice(i, 1);
      }
    }
    this.storeCalibrationAnswers(childId, answers);
  };

  getParentSeededTopics = (childId: string): MockParentSeededTopic[] => {
    return this.parentSeededTopicsList
      .filter((t) => t.childId === childId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  };

  createParentSeededTopic = (
    childId: string,
    topic: string,
  ): MockParentSeededTopic => {
    const entry: MockParentSeededTopic = {
      id: generateId(),
      childId,
      topic,
      createdAt: new Date().toISOString(),
    };
    this.parentSeededTopicsList.push(entry);
    return entry;
  };

  deleteParentSeededTopic = (topicId: string): void => {
    const idx = this.parentSeededTopicsList.findIndex((t) => t.id === topicId);
    if (idx !== -1) this.parentSeededTopicsList.splice(idx, 1);
  };
}
