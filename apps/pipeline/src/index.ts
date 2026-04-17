import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { streamSSE } from "hono/streaming";
import OpenAI from "openai";
import { buildSystemPrompt, type PromptConfig } from "./prompt.js";
import type {
  PresetName,
  PresetSliders,
  CalibrationAnswer,
} from "@child-safe-llm/shared";
import { PRESET_DEFINITIONS } from "@child-safe-llm/shared";
import { scanOutput } from "./blocklist.js";
import { detectSensitiveTopics } from "./sensitive-topics.js";
import { anchorSafetyContext } from "./context-anchoring.js";
import { validateResponse } from "./validation.js";
import {
  getFallbackResponse,
  createFlagEvent,
  type FlagEvent,
} from "./flag-and-forward.js";
import { checkConversationDepth } from "./depth-tracking.js";

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

app.use("/summarise", async (c, next) => {
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

interface ChatRequestBody {
  message: string;
  presetName: PresetName;
  childId?: string;
  sliders?: PresetSliders;
  calibrationAnswers?: CalibrationAnswer[];
  history?: { role: string; content: string }[];
}

app.post("/chat", (c) => {
  return streamSSE(c, async (sseStream) => {
    let body: ChatRequestBody;

    try {
      body = await c.req.json();
    } catch {
      await sseStream.writeSSE({
        data: JSON.stringify({ error: "Invalid request" }),
      });
      return;
    }

    const sliders =
      body.sliders ??
      PRESET_DEFINITIONS[body.presetName]?.sliders ??
      PRESET_DEFINITIONS["confident-reader"].sliders;

    const promptConfig: PromptConfig = {
      presetName: body.presetName,
      sliders,
      calibrationAnswers: body.calibrationAnswers,
    };

    // --- Step 1: Sensitive topic detection on the child's input ---
    const sensitiveResult = detectSensitiveTopics(body.message);

    // --- Step 1b: Conversation depth check for sensitive topic follow-ups ---
    if (sensitiveResult.isSensitive && body.history) {
      const depthResult = checkConversationDepth(body.history, body.message);
      if (depthResult.shouldRedirect && depthResult.redirectResponse) {
        const flagEvent = createFlagEvent(
          "sensitive",
          `Conversation depth limit reached (${depthResult.sensitiveCount} consecutive sensitive messages)`,
          body.message,
          { topics: sensitiveResult.topics },
        );
        await sseStream.writeSSE({
          data: JSON.stringify({ flag: flagEvent }),
        });
        await sseStream.writeSSE({
          data: JSON.stringify({ token: depthResult.redirectResponse }),
        });
        await sseStream.writeSSE({ data: "[DONE]" });
        return;
      }
    }

    // Build system prompt, adding escalated constraint if sensitive
    let systemPrompt = buildSystemPrompt(promptConfig);
    if (sensitiveResult.isSensitive && sensitiveResult.escalatedPrompt) {
      systemPrompt += "\n\n" + sensitiveResult.escalatedPrompt;
    }

    // --- Step 2: Build message list ---
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    if (body.history) {
      for (const msg of body.history) {
        // Runtime validation — only allow user/assistant roles.
        // Accepting "system" would let crafted requests inject system prompts.
        const role = msg.role === "user" ? "user" : "assistant";
        messages.push({ role, content: msg.content });
      }
    } else {
      messages.push({ role: "user", content: body.message });
    }

    // --- Step 3: Context anchoring for long conversations ---
    const anchoredMessages = anchorSafetyContext(messages);

    // --- Step 4: LLM call (non-streaming, so we can validate before sending) ---
    let fullResponse: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: anchoredMessages,
        stream: false,
        max_tokens: 500,
      });

      fullResponse = completion.choices[0]?.message?.content ?? "";
    } catch (err) {
      console.error("OpenRouter error:", err);
      await sseStream.writeSSE({
        data: JSON.stringify({ error: "Failed to get response" }),
      });
      return;
    }

    // --- Step 5: Output blocklist scan ---
    const blocklistResult = scanOutput(fullResponse);
    if (blocklistResult.blocked) {
      const categories = blocklistResult.matches
        .map((m) => m.category)
        .join(", ");
      const flagEvent = createFlagEvent(
        "blocked",
        `Output blocklist triggered: ${categories}`,
        body.message,
        { aiResponse: fullResponse },
      );
      await emitFlagAndFallback(sseStream, flagEvent);
      return;
    }

    // --- Step 6: Validation model call ---
    const validationResult = await validateResponse(
      openai,
      body.message,
      fullResponse,
      { presetName: body.presetName, sliders },
    );

    if (!validationResult.appropriate) {
      const flagEvent = createFlagEvent(
        "validation-failed",
        validationResult.reason,
        body.message,
        {
          aiResponse: fullResponse,
          topics: sensitiveResult.topics,
        },
      );
      await emitFlagAndFallback(sseStream, flagEvent);
      return;
    }

    // --- Step 7: If sensitive topic was detected, flag for parent (but still show the response) ---
    if (sensitiveResult.isSensitive) {
      const flagEvent = createFlagEvent(
        "sensitive",
        `Sensitive topic detected: ${sensitiveResult.topics.join(", ")}`,
        body.message,
        {
          aiResponse: fullResponse,
          topics: sensitiveResult.topics,
        },
      );
      await sseStream.writeSSE({
        data: JSON.stringify({ flag: flagEvent }),
      });
    }

    // --- Step 8: Stream the validated response to the client ---
    // We got the full response non-streaming for validation, but we emit
    // it in chunks to maintain the streaming UX on the client side
    const words = fullResponse.split(/(\s+)/);
    for (let i = 0; i < words.length; i += 2) {
      const chunk = words.slice(i, i + 2).join("");
      if (chunk) {
        await sseStream.writeSSE({ data: JSON.stringify({ token: chunk }) });
      }
    }

    await sseStream.writeSSE({ data: "[DONE]" });
  });
});

interface SummariseRequestBody {
  messages: { role: string; content: string }[];
  childName?: string;
}

app.post("/summarise", async (c) => {
  let body: SummariseRequestBody;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request" }, 400);
  }

  if (!body.messages || body.messages.length === 0) {
    return c.json({ error: "No messages to summarise" }, 400);
  }

  const messageText = body.messages
    .map(
      (m) =>
        `${m.role === "user" || m.role === "child" ? "Child" : "AI"}: ${m.content}`,
    )
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are summarising a conversation between a child and an AI assistant. " +
            "Write a brief, parent-friendly summary (2-4 sentences) that captures the main topics discussed " +
            "and any notable moments. Use simple language. Do not include any inappropriate content " +
            "even if it appeared in the conversation.",
        },
        {
          role: "user",
          content: `Summarise this conversation:\n\n${messageText}`,
        },
      ],
      stream: false,
      max_tokens: 200,
    });

    const summary = completion.choices[0]?.message?.content ?? "";
    return c.json({ summary });
  } catch (err) {
    console.error("Summarisation error:", err);
    return c.json({ error: "Failed to generate summary" }, 500);
  }
});

const emitFlagAndFallback = async (
  sseStream: Parameters<Parameters<typeof streamSSE>[1]> extends [
    infer S,
    ...unknown[],
  ]
    ? S
    : never,
  flagEvent: FlagEvent,
) => {
  // Emit the flag event for the web app to persist
  await sseStream.writeSSE({
    data: JSON.stringify({ flag: flagEvent }),
  });

  // Emit the safe fallback response
  const fallback = getFallbackResponse(flagEvent.type);
  await sseStream.writeSSE({
    data: JSON.stringify({ token: fallback }),
  });

  await sseStream.writeSSE({ data: "[DONE]" });
};

const port = Number(process.env.PORT) || 3001;

console.log(`Pipeline service running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
