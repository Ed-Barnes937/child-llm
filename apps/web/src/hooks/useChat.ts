import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getChildSession, type ChildSession } from "@/lib/child-session";
import { chatApi } from "@/api/chat";
import { conversationsApi } from "@/api/conversations";
import type { PresetSliders, CalibrationAnswer } from "@child-safe-llm/shared";
import { getSessionLimit, MAX_CONVERSATION_TITLE_LEN } from "@/lib/chat-config";

export interface ChatMessage {
  role: "child" | "ai";
  content: string;
  flagged?: boolean;
}

type PipelineFlag = {
  type: "sensitive" | "blocked" | "validation-failed";
  reason: string;
  topics?: string[];
  childMessage: string;
  aiResponse?: string;
};

interface UseChatOptions {
  conversationId?: string;
}

export interface UseChatResult {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  streaming: boolean;
  loading: boolean;
  summary: string | null;
  sliders: PresetSliders | null;
  reportedMessages: Set<number>;
  isAtLimit: boolean;
  isNearLimit: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  childSession: ChildSession | null;
  sendMessage: (text: string) => Promise<void>;
  handleReport: (messageIndex: number) => Promise<void>;
  deleteConversation: () => Promise<void>;
}

export const useChat = ({
  conversationId,
}: UseChatOptions = {}): UseChatResult => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState<boolean>(Boolean(conversationId));
  const [summary, setSummary] = useState<string | null>(null);
  const [sliders, setSliders] = useState<PresetSliders | null>(null);
  const [calibrationAnswers, setCalibrationAnswers] = useState<
    CalibrationAnswer[]
  >([]);
  const [reportedMessages, setReportedMessages] = useState<Set<number>>(
    new Set(),
  );
  const [messageCount, setMessageCount] = useState(0);

  const childSessionRef = useRef<ChildSession | null>(getChildSession());
  const currentConversationId = useRef<string | null>(conversationId ?? null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!childSessionRef.current) {
      navigate({ to: "/child/login" });
    }
  }, [navigate]);

  useEffect(() => {
    const child = childSessionRef.current;
    if (!child) return;

    const loadConfig = async () => {
      try {
        const config = await conversationsApi.getChildConfig(child.id);
        setSliders(config.sliders);
        setCalibrationAnswers(config.calibrationAnswers);
      } catch {
        // Fall through — chat still works with preset defaults.
      }
    };

    if (!conversationId) {
      loadConfig();
      return;
    }

    currentConversationId.current = conversationId;

    const loadConversation = async () => {
      try {
        const [existingMessages, summaryResult] = await Promise.all([
          conversationsApi.getMessages(conversationId),
          conversationsApi.getSummary(conversationId).catch(() => null),
        ]);

        if (summaryResult?.summary) setSummary(summaryResult.summary);

        const hasMessages = existingMessages.length > 0;
        const hasSummary = Boolean(summaryResult?.summary);

        if (!hasMessages && !hasSummary) {
          navigate({ to: "/child/home" });
          return;
        }

        const loaded: ChatMessage[] = existingMessages.map((m) => ({
          role: m.role as "child" | "ai",
          content: m.content,
          flagged: m.flagged,
        }));
        setMessages(loaded);
        setMessageCount(loaded.length);
      } catch {
        navigate({ to: "/child/home" });
        return;
      } finally {
        setLoading(false);
      }

      await loadConfig();
    };

    loadConversation();
  }, [conversationId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sessionLimit = getSessionLimit(sliders);
  const warningThreshold = Math.floor(sessionLimit * 0.8);
  const isAtLimit = messageCount >= sessionLimit;
  const isNearLimit =
    messageCount >= warningThreshold && !isAtLimit && isFinite(sessionLimit);

  const ensureConversation = async (firstMessage: string): Promise<string> => {
    if (currentConversationId.current) return currentConversationId.current;

    const title = firstMessage.slice(0, MAX_CONVERSATION_TITLE_LEN);
    const conversation = await conversationsApi.create({
      childId: childSessionRef.current!.id,
      title,
    });
    currentConversationId.current = conversation.id;
    return conversation.id;
  };

  const persistFlag = async (flag: PipelineFlag) => {
    const child = childSessionRef.current;
    if (!child) return;

    await conversationsApi.createFlag({
      childId: child.id,
      conversationId: currentConversationId.current ?? undefined,
      type: flag.type,
      reason: flag.reason,
      childMessage: flag.childMessage,
      aiResponse: flag.aiResponse,
      topics: flag.topics,
    });
  };

  const handleReport = useCallback(
    async (messageIndex: number) => {
      const child = childSessionRef.current;
      if (!child || reportedMessages.has(messageIndex)) return;

      const aiMsg = messages[messageIndex];
      const childMsg = messages[messageIndex - 1];

      setReportedMessages((prev) => new Set(prev).add(messageIndex));

      try {
        await conversationsApi.createFlag({
          childId: child.id,
          conversationId: currentConversationId.current ?? undefined,
          type: "reported",
          reason: "Child reported unsatisfactory answer",
          childMessage: childMsg?.content,
          aiResponse: aiMsg?.content,
        });
      } catch (err) {
        console.error("Failed to persist report flag", err);
      }
    },
    [messages, reportedMessages],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming || isAtLimit) return;

      const newMessages: ChatMessage[] = [
        ...messages,
        { role: "child", content: text },
      ];
      setMessages(newMessages);
      setInput("");
      setStreaming(true);

      setMessages([...newMessages, { role: "ai", content: "" }]);

      let childCounted = false;
      try {
        const convoId = await ensureConversation(text);

        await conversationsApi.saveMessage(convoId, {
          role: "child",
          content: text,
        });
        setMessageCount((prev) => prev + 1);
        childCounted = true;

        const stream = chatApi.stream({
          message: text,
          presetName: childSessionRef.current?.presetName ?? "confident-reader",
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
        let errored = false;

        for await (const chunk of stream) {
          if ("error" in chunk) {
            errored = true;
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
            try {
              await persistFlag(chunk.flag);
            } catch (err) {
              console.error("Failed to persist flag", err);
            }
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

        if (aiContent && !errored) {
          await conversationsApi.saveMessage(convoId, {
            role: "ai",
            content: aiContent,
            flagged: wasFlagged,
          });
          setMessageCount((prev) => prev + 1);
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
        if (childCounted) setMessageCount((prev) => Math.max(0, prev - 1));
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, isAtLimit, sliders, calibrationAnswers],
  );

  const deleteConversation = useCallback(async () => {
    const id = currentConversationId.current;
    if (!id) return;
    await conversationsApi.deleteConversation(id);
    navigate({ to: "/child/home" });
  }, [navigate]);

  return {
    messages,
    input,
    setInput,
    streaming,
    loading,
    summary,
    sliders,
    reportedMessages,
    isAtLimit,
    isNearLimit,
    messagesEndRef,
    childSession: childSessionRef.current,
    sendMessage,
    handleReport,
    deleteConversation,
  };
};
