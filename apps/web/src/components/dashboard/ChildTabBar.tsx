import { cn } from "@/lib/utils";
import type { ChildSummary } from "@/api/types";

interface ChildTabBarProps {
  children: ChildSummary[];
  selectedChildId: string;
  onSelect: (childId: string) => void;
}

const ChildTabBar = ({
  children,
  selectedChildId,
  onSelect,
}: ChildTabBarProps) => {
  return (
    <div role="tablist" className="flex gap-1 border-b">
      {children.map((child) => {
        const isSelected = child.id === selectedChildId;
        return (
          <button
            key={child.id}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(child.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              "rounded-t-md border-b-2",
              isSelected
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
            )}
          >
            {child.displayName}
          </button>
        );
      })}
    </div>
  );
};

export { ChildTabBar };
