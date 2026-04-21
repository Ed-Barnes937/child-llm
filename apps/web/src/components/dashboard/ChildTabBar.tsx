import { useRef, useCallback } from "react";
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
  const tablistRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = children.findIndex((c) => c.id === selectedChildId);
      if (currentIndex === -1) return;

      let nextIndex: number | null = null;

      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % children.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + children.length) % children.length;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        onSelect(children[nextIndex].id);
        const buttons =
          tablistRef.current?.querySelectorAll<HTMLButtonElement>(
            '[role="tab"]',
          );
        buttons?.[nextIndex]?.focus();
      }
    },
    [children, selectedChildId, onSelect],
  );

  return (
    <div
      ref={tablistRef}
      role="tablist"
      className="flex gap-1 border-b"
      onKeyDown={handleKeyDown}
    >
      {children.map((child) => {
        const isSelected = child.id === selectedChildId;
        return (
          <button
            key={child.id}
            role="tab"
            aria-selected={isSelected}
            aria-controls={`tabpanel-${child.id}`}
            tabIndex={isSelected ? 0 : -1}
            id={`tab-${child.id}`}
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
