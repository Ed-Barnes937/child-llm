import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parentAuth } from "@/api/parent-auth";
import { useParentSession } from "@/queries/parent-auth";
import { useChildrenByParent } from "@/queries/children";
import { ChildTabBar } from "@/components/dashboard/ChildTabBar";
import { ChildSummaryPanel } from "@/components/dashboard/ChildSummaryPanel";
import { PRESET_DEFINITIONS, type PresetName } from "@child-safe-llm/shared";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = useParentSession();
  const { data: kids, isLoading: loadingKids } = useChildrenByParent(
    session?.user?.id,
  );
  const [userSelectedChildId, setUserSelectedChildId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: "/parent/login" });
    }
  }, [isPending, session, navigate]);

  // Derive the effective selected child: user's explicit pick, or first child
  const activeChildId = useMemo(() => {
    if (!kids || kids.length === 0) return null;
    const userPickIsValid =
      userSelectedChildId && kids.some((k) => k.id === userSelectedChildId);
    return userPickIsValid ? userSelectedChildId : kids[0].id;
  }, [kids, userSelectedChildId]);

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
            await parentAuth.signOut();
            navigate({ to: "/" });
          }}
        >
          Log out
        </Button>
      </div>

      <p className="text-muted-foreground mt-2">
        Welcome, {session.user?.name ?? "parent"}.
      </p>

      <div className="mt-6 flex items-center gap-2">
        <Link
          to="/parent/onboarding"
          className={buttonVariants({ size: "sm" })}
        >
          Add child
        </Link>
        <a
          href="/parent/flags"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          View flags
        </a>
      </div>

      <div className="mt-8 space-y-4">
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
          <>
            <ChildTabBar
              children={kids}
              selectedChildId={activeChildId ?? kids[0].id}
              onSelect={setUserSelectedChildId}
            />
            {activeChildId && (
              <div
                role="tabpanel"
                id={`tabpanel-${activeChildId}`}
                aria-labelledby={`tab-${activeChildId}`}
              >
                <ChildSummaryPanel
                  childId={activeChildId}
                  presetLabel={
                    PRESET_DEFINITIONS[
                      kids.find((k) => k.id === activeChildId)
                        ?.presetName as PresetName
                    ]?.label
                  }
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/parent/dashboard")({
  component: DashboardPage,
});
