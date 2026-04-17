import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getChildSession } from "@/lib/child-session";
import { chatApi } from "@/api/chat";
import { conversationsApi } from "@/api/conversations";
import type { PresetSliders, CalibrationAnswer } from "@child-safe-llm/shared";
import { SESSION_LIMIT_MAP } from "@/lib/inspire-me";

interface Message {
  role: "child" | "ai";
  content: string;
  flagged?: boolean;
}

const ContinueChatPage = () => {
  const navigate = useNavigate();
  const { conversationId } = Route.useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [sliders, setSliders] = useState<PresetSliders | null>(null);
  const [calibrationAnswers, setCalibrationAnswers] = useState<
    CalibrationAnswer[]
  >([]);
  const [reportedMessages, setReportedMessages] = useState<Set<number>>(
    new Set(),
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const childSession = useRef(getChildSession());
  const messageCount = useRef(0);

  useEffect(() => {
    if (!childSession.current) {
      navigate({ to: "/child/login" });
      return;
    }

    const load = async () => {
      try {
        const [existingMessages, summaryResult, config] = await Promise.all([
          conversationsApi.getMessages(conversationId),
          conversationsApi.getSummary(conversationId).catch(() => null),
          conversationsApi
            .getChildConfig(childSession.current!.id)
            .catch(() => null),
        ]);

        if (summaryResult?.summary) {
          setSummary(summaryResult.summary);
        }

        const loaded: Message[] = existingMessages.map((m) => ({
          role: m.role as "child" | "ai",
          content: m.content,
          flagged: m.flagged,
        }));
        setMessages(loaded);
        messageCount.current = loaded.length;

        if (config) {
          setSliders(config.sliders);
          setCalibrationAnswers(config.calibrationAnswers);
        }
      } catch {
        // Fall through — empty conversation
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sessionLimit = sliders
    ? (SESSION_LIMIT_MAP[sliders.sessionLimits] ?? Infinity)
    : Infinity;
  const warningThreshold = Math.floor(sessionLimit * 0.8);
  const isAtLimit = messageCount.current >= sessionLimit;
  const isNearLimit =
    messageCount.current >= warningThreshold &&
    !isAtLimit &&
    isFinite(sessionLimit);

  const persistFlag = async (flag: {
    type: "sensitive" | "blocked" | "validation-failed";
    reason: string;
    topics?: string[];
    childMessage: string;
    aiResponse?: string;
  }) => {
    const child = childSession.current;
    if (!child) return;

    await conversationsApi.createFlag({
      childId: child.id,
      conversationId,
      type: flag.type,
      reason: flag.reason,
      childMessage: flag.childMessage,
      aiResponse: flag.aiResponse,
      topics: flag.topics,
    });
  };

  const handleReport = async (messageIndex: number) => {
    const child = childSession.current;
    if (!child || reportedMessages.has(messageIndex)) return;

    const aiMsg = messages[messageIndex];
    const childMsg = messages[messageIndex - 1];

    setReportedMessages((prev) => new Set(prev).add(messageIndex));

    await conversationsApi.createFlag({
      childId: child.id,
      conversationId,
      type: "reported",
      reason: "Child reported unsatisfactory answer",
      childMessage: childMsg?.content,
      aiResponse: aiMsg?.content,
    });
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming || isAtLimit) return;

      messageCount.current += 1;

      const newMessages: Message[] = [
        ...messages,
        { role: "child", content: text },
      ];
      setMessages(newMessages);
      setInput("");
      setStreaming(true);

      setMessages([...newMessages, { role: "ai", content: "" }]);

      try {
        await conversationsApi.saveMessage(conversationId, {
          role: "child",
          content: text,
        });

        const stream = chatApi.stream({
          message: text,
          presetName: childSession.current?.presetName ?? "confident-reader",
          sliders: sliders ?? undefined,
          calibrationAnswers:
            calibrationAnswers.length > 0 ? calibrationAnswers : undefined,
          history: newMessages.map((m) => ({
            role: m.role === "child" ? "user" : "assistant",
            content: m.content,
          })),
        });

        let aiContent = "";
        let wasFlagged = false;

        for await (const chunk of stream) {
          if ("error" in chunk) {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "ai",
                content: "Sorry, something went wrong. Please try again.",
              };
              return updated;
            });
            break;
          }

          if ("flag" in chunk) {
            wasFlagged = true;
            persistFlag(chunk.flag);
            continue;
          }

          if ("token" in chunk) {
            aiContent += chunk.token;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              updated[updated.length - 1] = {
                ...last,
                content: last.content + chunk.token,
              };
              return updated;
            });
          }
        }

        if (aiContent) {
          messageCount.current += 1;
          await conversationsApi.saveMessage(conversationId, {
            role: "ai",
            content: aiContent,
            flagged: wasFlagged,
          });
        }
      } catch {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "ai",
            content: "Sorry, something went wrong. Please try again.",
          };
          return updated;
        });
      } finally {
        setStreaming(false);
      }
    },
    [
      messages,
      streaming,
      sliders,
      calibrationAnswers,
      isAtLimit,
      conversationId,
    ],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleDelete = async () => {
    await conversationsApi.deleteConversation(conversationId);
    navigate({ to: "/child/home" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading conversation...</p>
      </div>
    );
  }

  if (summary && messages.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-border flex items-center justify-between border-b px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/child/home" })}
          >
            Back
          </Button>
          <h1 className="text-sm font-medium">Conversation summary</h1>
          <div className="w-16" />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
          <div className="mx-auto w-full max-w-lg">
            <div
              data-testid="conversation-summary"
              className="bg-muted rounded-xl p-6"
            >
              <p className="text-sm leading-relaxed">{summary}</p>
            </div>
            <p className="text-muted-foreground mt-4 text-center text-xs">
              The full conversation has been summarised to save space.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                variant="destructive"
                size="sm"
                data-testid="delete-conversation"
                onClick={handleDelete}
              >
                Delete conversation
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border flex items-center justify-between border-b px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/child/home" })}
        >
          Back
        </Button>
        <h1 className="text-sm font-medium">Conversation</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-lg space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "child" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[80%]">
                <div
                  data-testid={msg.role === "ai" ? "ai-message" : undefined}
                  className={`rounded-2xl px-4 py-2 ${
                    msg.role === "child"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">
                    {msg.content ||
                      (streaming && i === messages.length - 1 ? "..." : "")}
                  </p>
                </div>
                {msg.role === "ai" && msg.content && !streaming && (
                  <div className="mt-1 flex justify-start">
                    <button
                      data-testid="report-button"
                      onClick={() => handleReport(i)}
                      disabled={reportedMessages.has(i)}
                      className="text-muted-foreground hover:text-destructive text-xs disabled:opacity-50"
                    >
                      {reportedMessages.has(i)
                        ? "Reported"
                        : "Report this answer"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isNearLimit && (
            <div
              data-testid="session-warning"
              className="bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200 rounded-lg p-3 text-center text-sm"
            >
              You&apos;re getting close to your session limit. Try to wrap up
              soon!
            </div>
          )}

          {isAtLimit && (
            <div
              data-testid="session-limit"
              className="bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200 rounded-lg p-3 text-center text-sm"
            >
              You&apos;ve reached your session limit. Time for a break!
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-border border-t px-4 py-3">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-lg gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={streaming || isAtLimit}
            autoFocus
          />
          <Button
            type="submit"
            disabled={streaming || !input.trim() || isAtLimit}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/child/chat/$conversationId")({
  component: ContinueChatPage,
});
