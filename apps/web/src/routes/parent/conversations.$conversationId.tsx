import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useParentSession } from "@/queries/parent-auth";
import { useFlagsByParent } from "@/queries/flags";
import { useConversationMessages } from "@/queries/conversations";
import { ReadOnlyTranscript } from "@/components/dashboard/ReadOnlyTranscript";
import { Button } from "@/components/ui/button";

const ConversationDetailPage = () => {
  const navigate = useNavigate();
  const { conversationId } = Route.useParams();
  const { data: session, isPending } = useParentSession();

  const parentId = session?.user?.id;

  const { data: flags } = useFlagsByParent(parentId);
  const { data: messages = [], isLoading: loadingMessages } =
    useConversationMessages(conversationId);

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: "/parent/login" });
    }
  }, [isPending, session, navigate]);

  // Determine flagged message IDs from the flags data
  const flaggedMessageIds = useMemo(() => {
    const ids = new Set<string>();
    if (flags) {
      for (const flag of flags) {
        if (flag.conversationId === conversationId && flag.messageId) {
          ids.add(flag.messageId);
        }
      }
    }
    // Also check message-level flagged field
    for (const msg of messages) {
      if (msg.flagged) {
        ids.add(msg.id);
      }
    }
    return ids;
  }, [flags, conversationId, messages]);

  // Derive conversation title from flags data
  const conversationTitle = useMemo(() => {
    if (flags) {
      const matchingFlag = flags.find(
        (f) => f.conversationId === conversationId,
      );
      if (matchingFlag) {
        return `Conversation with ${matchingFlag.childDisplayName}`;
      }
    }
    return "Conversation Detail";
  }, [flags, conversationId]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="conversation-title">
          {conversationTitle}
        </h1>
        <Link to="/parent/flags">
          <Button variant="outline" size="sm" data-testid="back-button">
            Back
          </Button>
        </Link>
      </div>

      <div className="mt-6">
        {loadingMessages ? (
          <p className="text-muted-foreground text-sm">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              No messages found for this conversation.
            </p>
          </div>
        ) : (
          <ReadOnlyTranscript
            messages={messages}
            flaggedMessageIds={flaggedMessageIds}
          />
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/parent/conversations/$conversationId")({
  component: ConversationDetailPage,
});
