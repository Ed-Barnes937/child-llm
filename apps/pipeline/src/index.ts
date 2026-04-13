import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { streamSSE } from "hono/streaming";
import OpenAI from "openai";
import { buildSystemPrompt } from "./prompt.js";
import type { PresetName } from "@child-safe-llm/shared";

const app = new Hono();

const PIPELINE_API_KEY = process.env.PIPELINE_API_KEY ?? "dev-pipeline-key";

// Service-to-service auth middleware
app.use("/chat", async (c, next) => {
  const apiKey = c.req.header("x-pipeline-key");
  if (apiKey !== PIPELINE_API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/chat", (c) => {
  return streamSSE(c, async (sseStream) => {
    let body: {
      message: string;
      presetName: PresetName;
      history?: { role: string; content: string }[];
    };

    try {
      body = await c.req.json();
    } catch {
      await sseStream.writeSSE({ data: JSON.stringify({ error: "Invalid request" }) });
      return;
    }

    const systemPrompt = buildSystemPrompt(body.presetName);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history
    if (body.history) {
      for (const msg of body.history) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    } else {
      messages.push({ role: "user", content: body.message });
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages,
        stream: true,
        max_tokens: 500,
      });

      for await (const chunk of completion) {
        const token = chunk.choices[0]?.delta?.content;
        if (token) {
          await sseStream.writeSSE({ data: JSON.stringify({ token }) });
        }
      }

      await sseStream.writeSSE({ data: "[DONE]" });
    } catch (err) {
      console.error("OpenRouter error:", err);
      await sseStream.writeSSE({
        data: JSON.stringify({ error: "Failed to get response" }),
      });
    }
  });
});

const port = Number(process.env.PORT) || 3001;

console.log(`Pipeline service running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
