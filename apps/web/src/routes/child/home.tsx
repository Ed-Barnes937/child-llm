import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { getChildSession, clearChildSession } from "@/lib/child-session";

export const Route = createFileRoute("/child/home")({
  component: ChildHomePage,
});

function ChildHomePage() {
  const navigate = useNavigate();
  const [session] = useState(() => getChildSession());

  useEffect(() => {
    if (!session) {
      navigate({ to: "/child/login" });
    }
  }, [session, navigate]);

  const childName = session?.displayName ?? "";

  function handleLogout() {
    clearChildSession();
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hi, {childName}!</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Log out
        </Button>
      </div>

      <div className="mt-12 flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-center text-lg">
          What would you like to talk about?
        </p>
        <Link
          to="/child/chat/new"
          className={buttonVariants({ size: "lg", className: "w-full max-w-xs" })}
        >
          Start a new conversation
        </Link>
      </div>
    </div>
  );
}
