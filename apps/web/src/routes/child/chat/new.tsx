import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getChildSession } from "@/lib/child-session";
import { chatApi } from "@/api/chat";
import { conversationsApi } from "@/api/conversations";

interface Message {
  role: "child" | "ai";
  content: string;
  flagged?: boolean;
}

const ChatPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const childSession = useRef(getChildSession());
  const conversationId = useRef<string | null>(null);

  useEffect(() => {
    if (!childSession.current) {
      navigate({ to: "/child/login" });
    }
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ensureConversation = async (firstMessage: string): Promise<string> => {
    if (conversationId.current) return conversationId.current;

    const title = firstMessage.slice(0, 100);
    const conversation = await conversationsApi.create({
      childId: childSession.current!.id,
      title,
    });
    conversationId.current = conversation.id;
    return conversation.id;
  };

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
      conversationId: conversationId.current ?? undefined,
      type: flag.type,
      reason: flag.reason,
      childMessage: flag.childMessage,
      aiResponse: flag.aiResponse,
      topics: flag.topics,
    });
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;

      const newMessages: Message[] = [
        ...messages,
        { role: "child", content: text },
      ];
      setMessages(newMessages);
      setInput("");
      setStreaming(true);

      setMessages([...newMessages, { role: "ai", content: "" }]);

      try {
        const convoId = await ensureConversation(text);

        await conversationsApi.saveMessage(convoId, {
          role: "child",
          content: text,
        });

        const stream = chatApi.stream({
          message: text,
          presetName: childSession.current?.presetName ?? "confident-reader",
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
          await conversationsApi.saveMessage(convoId, {
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
    [messages, streaming],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-border flex items-center justify-between border-b px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/child/home" })}
        >
          Back
        </Button>
        <h1 className="text-sm font-medium">New conversation</h1>
        <div className="w-16" />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-center">
              Ask me anything! I&apos;m here to help you learn.
            </p>
          </div>
        )}

        <div className="mx-auto max-w-lg space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "child" ? "justify-end" : "justify-start"}`}
            >
              <div
                data-testid={msg.role === "ai" ? "ai-message" : undefined}
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
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
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-border border-t px-4 py-3">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-lg gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={streaming}
            autoFocus
          />
          <Button type="submit" disabled={streaming || !input.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/child/chat/new")({
  component: ChatPage,
});
