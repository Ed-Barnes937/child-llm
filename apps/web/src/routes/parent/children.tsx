import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useParentSession } from "@/queries/parent-auth";
import { useChildrenByParent } from "@/queries/children";
import { PRESET_DEFINITIONS, type PresetName } from "@child-safe-llm/shared";

const ChildrenListPage = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = useParentSession();
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
        <h1 className="text-2xl font-bold">Children</h1>
        <Link
          to="/parent/onboarding"
          className={buttonVariants({ size: "sm" })}
        >
          Add child
        </Link>
      </div>

      <Link
        to="/parent/dashboard"
        className="text-muted-foreground mt-2 inline-block text-sm underline"
      >
        Back to dashboard
      </Link>

      <div className="mt-6 space-y-3">
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
          kids.map((child) => (
            <Link
              key={child.id}
              to="/parent/children/$childId"
              params={{ childId: child.id }}
              className="block"
            >
              <Card className="transition-colors hover:border-primary/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {child.displayName}
                  </CardTitle>
                  <CardDescription>
                    {PRESET_DEFINITIONS[child.presetName as PresetName]
                      ?.label ?? child.presetName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Tap to manage settings
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/parent/children")({
  component: ChildrenListPage,
});
