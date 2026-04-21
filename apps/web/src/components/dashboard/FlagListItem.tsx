import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FlagDetail } from "@/api/types";

const FLAG_TYPE_STYLES: Record<
  FlagDetail["type"],
  { label: string; className: string }
> = {
  sensitive: { label: "Sensitive", className: "bg-yellow-100 text-yellow-800" },
  blocked: { label: "Blocked", className: "bg-red-100 text-red-800" },
  "validation-failed": {
    label: "Validation Failed",
    className: "bg-orange-100 text-orange-800",
  },
  reported: { label: "Reported", className: "bg-blue-100 text-blue-800" },
};

interface FlagListItemProps {
  flag: FlagDetail;
  onMarkReviewed: (flagId: string) => void;
}

export const FlagListItem = ({ flag, onMarkReviewed }: FlagListItemProps) => {
  const typeStyle = FLAG_TYPE_STYLES[flag.type] ?? {
    label: flag.type,
    className: "bg-gray-100 text-gray-800",
  };

  const parsedTopics: string[] = flag.topics
    ? (() => {
        try {
          return JSON.parse(flag.topics) as string[];
        } catch {
          return [];
        }
      })()
    : [];

  return (
    <Card data-testid="flag-item">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {flag.childDisplayName}
              </span>
              <span
                data-testid="flag-type-badge"
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeStyle.className}`}
              >
                {typeStyle.label}
              </span>
              <span className="text-muted-foreground text-xs">
                {new Date(flag.createdAt).toLocaleString()}
              </span>
            </div>

            <p className="mt-1 text-sm">{flag.reason}</p>

            {parsedTopics.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {parsedTopics.map((topic) => (
                  <span
                    key={topic}
                    data-testid="flag-topic"
                    className="bg-muted inline-flex items-center rounded px-1.5 py-0.5 text-xs"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button
            size="sm"
            variant={flag.reviewed ? "outline" : "default"}
            disabled={flag.reviewed}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkReviewed(flag.id);
            }}
            data-testid="mark-reviewed-button"
            aria-label={flag.reviewed ? "Reviewed" : "Mark as reviewed"}
          >
            {flag.reviewed ? "\u2713 Reviewed" : "Mark as reviewed"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
