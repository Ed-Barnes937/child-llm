import type { PresetName } from "@child-safe-llm/shared";

// Children
export interface CreateChildRequest {
  parentId: string;
  displayName: string;
  presetName: PresetName;
  pin: string;
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
  history: { role: string; content: string }[];
}

export interface ChatStreamToken {
  token: string;
}

export interface ChatStreamError {
  error: string;
}

export type ChatStreamChunk = ChatStreamToken | ChatStreamError;
