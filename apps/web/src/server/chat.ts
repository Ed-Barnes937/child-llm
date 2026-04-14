import { createServerFn } from "@tanstack/react-start";
import type { PresetName } from "@child-safe-llm/shared";

export const streamChat = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      message: string;
      presetName: PresetName;
      history: { role: string; content: string }[];
    }) => d,
  )
  .handler(async function* ({ data }) {
    const pipelineUrl = process.env.PIPELINE_URL ?? "http://localhost:3001";
    const pipelineKey = process.env.PIPELINE_API_KEY ?? "dev-pipeline-key";

    const response = await fetch(`${pipelineUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pipeline-key": pipelineKey,
      },
      body: JSON.stringify({
        message: data.message,
        presetName: data.presetName,
        history: data.history,
      }),
    });

    if (!response.ok || !response.body) {
      yield { error: "Failed to get response" };
      return;
    }

    const reader = response.body.getReader();
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
  });
