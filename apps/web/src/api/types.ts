import type {
  PresetName,
  PresetSliders,
  CalibrationAnswer,
} from "@child-safe-llm/shared";

// Children
export interface CreateChildRequest {
  parentId: string;
  displayName: string;
  presetName: PresetName;
  pin: string;
  sliderOverrides?: Partial<PresetSliders>;
  calibrationAnswers?: CalibrationAnswer[];
}

export interface CreateChildResponse {
  child: { id: string; username: string; displayName: string };
}

export interface ChildSummary {
  id: string;
  displayName: string;
  username: string;
  presetName: string;
}

// Child Auth
export interface ChildLoginPasswordRequest {
  username: string;
  password: string;
  deviceToken: string;
}

export interface ChildLoginPinRequest {
  childId: string;
  pin: string;
  deviceToken: string;
}

export interface ChildLoginResponse {
  child?: {
    id: string;
    displayName: string;
    username: string;
    presetName: PresetName;
    parentId: string;
  };
  error?: string;
}

export interface DeviceChild {
  id: string;
  displayName: string;
  presetName: string;
}

export interface GetChildrenForDeviceResponse {
  children: DeviceChild[];
}

// Parent Auth
export interface ParentSession {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Chat
export interface ChatStreamRequest {
  message: string;
  presetName: PresetName;
  childId?: string;
  sliders?: PresetSliders;
  calibrationAnswers?: CalibrationAnswer[];
  history: { role: string; content: string }[];
}

export interface ChatStreamToken {
  token: string;
}

export interface ChatStreamError {
  error: string;
}

export interface ChatStreamFlag {
  flag: {
    type: "sensitive" | "blocked" | "validation-failed";
    reason: string;
    topics?: string[];
    childMessage: string;
    aiResponse?: string;
  };
}

export type ChatStreamChunk =
  | ChatStreamToken
  | ChatStreamError
  | ChatStreamFlag;
