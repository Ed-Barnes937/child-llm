import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChatTranscript } from "@/components/chat/ChatTranscript";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChat } from "@/hooks/useChat";

const ContinueChatPage = () => {
  const navigate = useNavigate();
  const { conversationId } = Route.useParams();

  const {
    messages,
    input,
    setInput,
    streaming,
    loading,
    summary,
    reportedMessages,
    isAtLimit,
    isNearLimit,
    messagesEndRef,
    sendMessage,
    handleReport,
    deleteConversation,
  } = useChat({ conversationId });

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
                onClick={deleteConversation}
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

      <ChatTranscript
        messages={messages}
        streaming={streaming}
        reportedMessages={reportedMessages}
        onReport={handleReport}
        isNearLimit={isNearLimit}
        isAtLimit={isAtLimit}
        messagesEndRef={messagesEndRef}
      />

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={() => sendMessage(input)}
        disabled={streaming || isAtLimit}
        canSubmit={Boolean(input.trim())}
      />
    </div>
  );
};

export const Route = createFileRoute("/child/chat/$conversationId")({
  component: ContinueChatPage,
});
