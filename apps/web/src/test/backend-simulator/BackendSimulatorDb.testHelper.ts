import { EndpointBehaviourManager } from "./EndpointBehaviourManager.testHelper";
import type { PresetName, CalibrationAnswer } from "@child-safe-llm/shared";

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

let nextId = 1;
const generateId = (): string => `mock-id-${nextId++}`;

export interface MockCalibrationAnswer {
  childId: string;
  questionId: string;
  selectedLevel: number | null;
  customAnswer: string | null;
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
  chatStreamScenario: ChatStreamScenario | null = null;

  /**
   * Configure what the mock chat stream endpoint returns.
   * If not set, defaults to the standard "The sun is a big star..." response.
   */
  setChatStreamScenario = (scenario: ChatStreamScenario): void => {
    this.chatStreamScenario = scenario;
  };

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
}
