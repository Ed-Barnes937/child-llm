import type {
  CreateConversationRequest,
  CreateConversationResponse,
  ConversationSummary,
  SaveMessageRequest,
  SaveMessageResponse,
  MessageResponse,
  CreateFlagRequest,
  CreateFlagResponse,
} from "./types";

export const conversationsApi = {
  create: async (
    data: CreateConversationRequest,
  ): Promise<CreateConversationResponse> => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  list: async (childId: string): Promise<ConversationSummary[]> => {
    const res = await fetch(
      `/api/conversations?childId=${encodeURIComponent(childId)}`,
    );
    return res.json();
  },

  getMessages: async (conversationId: string): Promise<MessageResponse[]> => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
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
    return res.json();
  },

  createFlag: async (data: CreateFlagRequest): Promise<CreateFlagResponse> => {
    const res = await fetch("/api/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
