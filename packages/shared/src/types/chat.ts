export type ChatRole = "child" | "ai";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  flagged: boolean;
}
