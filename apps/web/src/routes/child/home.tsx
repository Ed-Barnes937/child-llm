import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { getChildSession, clearChildSession } from "@/lib/child-session";
import { conversationsApi } from "@/api/conversations";
import type { ConversationSummary } from "@/api/types";
import { getRandomTopic, INSPIRE_SESSION_KEY } from "@/lib/inspire-me";

const ChildHomePage = () => {
  const navigate = useNavigate();
  const [session] = useState(() => getChildSession());
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    if (!session) {
      navigate({ to: "/child/login" });
      return;
    }

    conversationsApi
      .list(session.id)
      .then(setConversations)
      .catch(() => {});
  }, [session, navigate]);

  const childName = session?.displayName ?? "";

  const handleLogout = () => {
    clearChildSession();
    navigate({ to: "/" });
  };

  const handleInspireMe = () => {
    const topic = getRandomTopic();
    sessionStorage.setItem(INSPIRE_SESSION_KEY, topic);
    navigate({ to: "/child/chat/new" });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hi, {childName}!</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Log out
        </Button>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex gap-2">
          <Link
            to="/child/chat/new"
            className={buttonVariants({
              size: "lg",
              className: "flex-1",
            })}
          >
            Start a new conversation
          </Link>
          <Button
            variant="outline"
            size="lg"
            data-testid="inspire-me"
            onClick={handleInspireMe}
          >
            Inspire me
          </Button>
        </div>

        {conversations.length > 0 && (
          <div className="mt-4">
            <h2 className="mb-3 text-lg font-semibold">
              Previous conversations
            </h2>
            <div className="space-y-2">
              {conversations.map((convo) => (
                <Link
                  key={convo.id}
                  to="/child/chat/$conversationId"
                  params={{ conversationId: convo.id }}
                  className="bg-card hover:bg-accent border-border block rounded-lg border p-3 transition-colors"
                  data-testid="conversation-item"
                >
                  <p className="text-sm font-medium">
                    {convo.title ?? "Untitled"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(convo.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {conversations.length === 0 && (
          <p className="text-muted-foreground mt-8 text-center text-lg">
            What would you like to talk about?
          </p>
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/child/home")({
  component: ChildHomePage,
});
