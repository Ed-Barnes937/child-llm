import type { ChatStreamRequest, ChatStreamChunk } from "./types";

export const chatApi = {
  stream: async function* (
    data: ChatStreamRequest,
  ): AsyncGenerator<ChatStreamChunk> {
    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok || !res.body) {
      yield { error: "Failed to get response" };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.token) {
              yield { token: parsed.token as string };
            }
          } catch {
            // skip unparseable lines
          }
        }
      }
    }
  },
};
