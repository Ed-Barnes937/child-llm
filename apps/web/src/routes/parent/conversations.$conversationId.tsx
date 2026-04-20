import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useParentSession } from "@/queries/parent-auth";
import { useFlagsByParent } from "@/queries/flags";
import { conversationsApi } from "@/api/conversations";
import { ReadOnlyTranscript } from "@/components/dashboard/ReadOnlyTranscript";
import { Button } from "@/components/ui/button";
import type { MessageResponse } from "@/api/types";

const ConversationDetailPage = () => {
  const navigate = useNavigate();
  const { conversationId } = Route.useParams();
  const { data: session, isPending } = useParentSession();
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [conversationTitle, setConversationTitle] = useState<string | null>(
    null,
  );

  const parentId = session?.user?.id;

  const { data: flags } = useFlagsByParent(parentId);

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: "/parent/login" });
    }
  }, [isPending, session, navigate]);

  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      try {
        const msgs = await conversationsApi.getMessages(conversationId);
        setMessages(msgs);
      } catch {
        // Silently handle — empty messages shown
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [conversationId]);

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

  // Try to get conversation title from messages or flags
  useEffect(() => {
    if (flags) {
      const matchingFlag = flags.find(
        (f) => f.conversationId === conversationId,
      );
      if (matchingFlag) {
        setConversationTitle(
          `Conversation with ${matchingFlag.childDisplayName}`,
        );
        return;
      }
    }
    setConversationTitle("Conversation Detail");
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
