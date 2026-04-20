import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatTranscript } from "@/components/chat/ChatTranscript";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChat } from "@/hooks/useChat";
import {
  INTENT_CATEGORIES,
  getRandomTopic,
  INSPIRE_SESSION_KEY,
} from "@/lib/chat-config";

const ChatPage = () => {
  const navigate = useNavigate();
  const [dismissedIntent, setDismissedIntent] = useState(false);
  const [autoInspireHandled, setAutoInspireHandled] = useState(false);

  const {
    messages,
    input,
    setInput,
    streaming,
    sliders,
    reportedMessages,
    isAtLimit,
    isNearLimit,
    messagesEndRef,
    sendMessage,
    handleReport,
  } = useChat();

  // Mount-only: read the inspire topic from sessionStorage (avoids SSR
  // hydration mismatch from useState initializer) and send it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const topic = sessionStorage.getItem(INSPIRE_SESSION_KEY);
    if (!topic) return;
    sessionStorage.removeItem(INSPIRE_SESSION_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoInspireHandled(true);
    sendMessage(topic);
  }, [sendMessage]);

  const showIntentSelection =
    !dismissedIntent &&
    !autoInspireHandled &&
    sliders !== null &&
    sliders.interactionMode <= 3 &&
    messages.length === 0 &&
    !streaming;

  const handleSubmit = () => {
    setDismissedIntent(true);
    sendMessage(input);
  };

  const handleIntentSelect = (prompt: string) => {
    setDismissedIntent(true);
    setInput(prompt);
  };

  const handleInspireMe = () => {
    const topic = getRandomTopic();
    setDismissedIntent(true);
    sendMessage(topic);
  };

  if (showIntentSelection) {
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
          <h1 className="text-sm font-medium">What would you like to do?</h1>
          <div className="w-16" />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
          <div className="mx-auto grid w-full max-w-md gap-3">
            {INTENT_CATEGORIES.map((intent) => (
              <button
                key={intent.id}
                data-testid={`intent-${intent.id}`}
                onClick={() => handleIntentSelect(intent.prompt)}
                className="bg-card hover:bg-accent border-border flex items-center gap-3 rounded-xl border p-4 text-left transition-colors"
              >
                <span className="text-2xl">{intent.emoji}</span>
                <span className="text-sm font-medium">{intent.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              data-testid="inspire-me"
              onClick={handleInspireMe}
            >
              Inspire me
            </Button>
          </div>

          <button
            className="text-muted-foreground mt-4 text-sm underline"
            onClick={() => setDismissedIntent(true)}
          >
            Or just type your own question
          </button>
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
        <h1 className="text-sm font-medium">New conversation</h1>
        <div className="w-16" />
      </header>

      <ChatTranscript
        messages={messages}
        streaming={streaming}
        reportedMessages={reportedMessages}
        onReport={handleReport}
        isNearLimit={isNearLimit}
        isAtLimit={isAtLimit}
        messagesEndRef={messagesEndRef}
        emptyState={
          <p className="text-muted-foreground text-center">
            Ask me anything! I&apos;m here to help you learn.
          </p>
        }
      />

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={streaming || isAtLimit}
        canSubmit={Boolean(input.trim())}
        extraAction={
          messages.length === 0 ? (
            <Button
              type="button"
              variant="outline"
              data-testid="inspire-me"
              onClick={handleInspireMe}
              disabled={streaming}
            >
              Inspire me
            </Button>
          ) : undefined
        }
      />
    </div>
  );
};

export const Route = createFileRoute("/child/chat/new")({
  component: ChatPage,
});
