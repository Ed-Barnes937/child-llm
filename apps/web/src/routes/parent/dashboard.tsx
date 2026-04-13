import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { useChildrenByParent } from "@/queries/children";

const PRESET_LABELS: Record<string, string> = {
  "early-learner": "Early learner",
  "confident-reader": "Confident reader",
  "independent-explorer": "Independent explorer",
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const { data: kids, isLoading: loadingKids } = useChildrenByParent(
    session?.user?.id,
  );

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: "/parent/login" });
    }
  }, [isPending, session, navigate]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Parent Dashboard</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await authClient.signOut();
            navigate({ to: "/" });
          }}
        >
          Log out
        </Button>
      </div>

      <p className="text-muted-foreground mt-2">
        Welcome, {session.user?.name ?? "parent"}.
      </p>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Children</h2>
          <Link to="/parent/onboarding" className={buttonVariants({ size: "sm" })}>
            Add a child
          </Link>
        </div>

        {loadingKids ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : !kids || kids.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No children yet. Add your first child to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {kids.map((child) => (
              <Card key={child.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{child.displayName}</CardTitle>
                  <CardDescription>
                    {PRESET_LABELS[child.presetName] ?? child.presetName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Username: <span className="font-mono">{child.username}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/parent/dashboard")({
  component: DashboardPage,
});
