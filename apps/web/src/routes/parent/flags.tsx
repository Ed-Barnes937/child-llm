import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParentSession } from "@/queries/parent-auth";
import { useFlagsByParent, useMarkFlagReviewed } from "@/queries/flags";
import { useChildrenByParent } from "@/queries/children";
import { FlagListItem } from "@/components/dashboard/FlagListItem";

const FlagsPage = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = useParentSession();
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(
    () => {
      if (typeof window === "undefined") return undefined;
      const params = new URLSearchParams(window.location.search);
      return params.get("childId") ?? undefined;
    },
  );

  const parentId = session?.user?.id;

  const {
    data: flags,
    isLoading: loadingFlags,
    isError: flagsError,
  } = useFlagsByParent(parentId, selectedChildId);
  const { data: children } = useChildrenByParent(parentId);
  const markReviewed = useMarkFlagReviewed();

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

  const handleMarkReviewed = (flagId: string) => {
    markReviewed.mutate({ flagId, reviewed: true });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedChildId(value || undefined);

    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set("childId", value);
    } else {
      url.searchParams.delete("childId");
    }
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Flagged Conversations</h1>
        <Link
          to="/parent/dashboard"
          className="text-sm text-blue-600 hover:underline"
        >
          Back to dashboard
        </Link>
      </div>

      <p className="text-muted-foreground mt-2 text-sm">
        A record of what the safety checks flagged — and whether each reply was
        blocked before your child saw it or shown to them.
      </p>

      <div
        data-testid="safety-disclosure"
        className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <p className="font-medium">What this can and can&apos;t do</p>
        <p className="mt-1">
          No safety system is perfect. These guardrails lower the risk of unsafe
          or inappropriate content — they don&apos;t remove it. Some harmful
          content may still reach your child, and some harmless content may be
          flagged here. Treat this log as a record to review, not a guarantee,
          and stay involved in your child&apos;s conversations.
        </p>
      </div>

      <div className="mt-4">
        <label htmlFor="child-filter" className="sr-only">
          Filter by child
        </label>
        <select
          id="child-filter"
          data-testid="child-filter"
          className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          value={selectedChildId ?? ""}
          onChange={handleFilterChange}
        >
          <option value="">All children</option>
          {children?.map((child) => (
            <option key={child.id} value={child.id}>
              {child.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 space-y-3">
        {loadingFlags ? (
          <p className="text-muted-foreground text-sm">Loading flags...</p>
        ) : flagsError ? (
          <div className="py-8 text-center">
            <p className="text-destructive text-sm" data-testid="error-state">
              Couldn&apos;t load flagged conversations. Please try again.
            </p>
          </div>
        ) : !flags || flags.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground" data-testid="empty-state">
              No flagged conversations found.
            </p>
          </div>
        ) : (
          flags.map((flag) =>
            flag.conversationId ? (
              <Link
                key={flag.id}
                to="/parent/conversations/$conversationId"
                params={{ conversationId: flag.conversationId }}
                className="block"
                data-testid="flag-link"
              >
                <FlagListItem flag={flag} onMarkReviewed={handleMarkReviewed} />
              </Link>
            ) : (
              <div key={flag.id} data-testid="flag-link">
                <FlagListItem flag={flag} onMarkReviewed={handleMarkReviewed} />
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/parent/flags")({
  component: FlagsPage,
});
