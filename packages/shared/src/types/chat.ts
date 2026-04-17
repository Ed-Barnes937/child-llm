export type ChatRole = "child" | "ai";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  flagged: boolean;
}

export interface Conversation {
  id: string;
  childId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FlagType =
  | "sensitive"
  | "blocked"
  | "validation-failed"
  | "reported";

export interface Flag {
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
