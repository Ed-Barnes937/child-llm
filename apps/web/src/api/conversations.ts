import type {
  CreateConversationRequest,
  CreateConversationResponse,
  ConversationSummary,
  SaveMessageRequest,
  SaveMessageResponse,
  MessageResponse,
  CreateFlagRequest,
  CreateFlagResponse,
  ChildConfigResponse,
} from "./types";

const ensureOk = async (res: Response, context: string): Promise<void> => {
  if (!res.ok) {
    throw new Error(`${context} failed: ${res.status} ${res.statusText}`);
  }
};

export const conversationsApi = {
  create: async (
    data: CreateConversationRequest,
  ): Promise<CreateConversationResponse> => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await ensureOk(res, "Create conversation");
    return res.json();
  },

  list: async (childId: string): Promise<ConversationSummary[]> => {
    const res = await fetch(
      `/api/conversations?childId=${encodeURIComponent(childId)}`,
    );
    await ensureOk(res, "List conversations");
    return res.json();
  },

  getMessages: async (conversationId: string): Promise<MessageResponse[]> => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    await ensureOk(res, "Get conversation messages");
    return res.json();
  },

  saveMessage: async (
    conversationId: string,
    data: SaveMessageRequest,
  ): Promise<SaveMessageResponse> => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await ensureOk(res, "Save message");
    return res.json();
  },

  createFlag: async (data: CreateFlagRequest): Promise<CreateFlagResponse> => {
    const res = await fetch("/api/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await ensureOk(res, "Create flag");
    return res.json();
  },

  getChildConfig: async (childId: string): Promise<ChildConfigResponse> => {
    const res = await fetch(
      `/api/children/${encodeURIComponent(childId)}/config`,
    );
    await ensureOk(res, "Get child config");
    return res.json();
  },

  getSummary: async (
    conversationId: string,
  ): Promise<{ summary: string | null }> => {
    const res = await fetch(`/api/conversations/${conversationId}/summary`);
    await ensureOk(res, "Get conversation summary");
    return res.json();
  },

  deleteConversation: async (
    conversationId: string,
  ): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "DELETE",
    });
    await ensureOk(res, "Delete conversation");
    return res.json();
  },

  summariseAndPurge: async (
    conversationId: string,
  ): Promise<{ summary: string }> => {
    const res = await fetch(`/api/conversations/${conversationId}/summarise`, {
      method: "POST",
    });
    await ensureOk(res, "Summarise conversation");
    return res.json();
  },
};
