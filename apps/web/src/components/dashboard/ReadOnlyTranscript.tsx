import { useEffect, useRef } from "react";
import type { MessageResponse } from "@/api/types";

interface ReadOnlyTranscriptProps {
  messages: MessageResponse[];
  flaggedMessageIds: Set<string>;
  scrollToMessageId?: string;
}

export const ReadOnlyTranscript = ({
  messages,
  flaggedMessageIds,
  scrollToMessageId,
}: ReadOnlyTranscriptProps) => {
  const scrollTargetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollToMessageId && scrollTargetRef.current) {
      scrollTargetRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [scrollToMessageId]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="mx-auto max-w-lg space-y-3">
        {messages.map((msg) => {
          const isFlagged = flaggedMessageIds.has(msg.id);
          return (
            <div
              key={msg.id}
              ref={msg.id === scrollToMessageId ? scrollTargetRef : undefined}
              className={`flex ${msg.role === "child" ? "justify-end" : "justify-start"}`}
              data-flagged={isFlagged ? "true" : undefined}
              data-testid="transcript-message"
            >
              <div className="max-w-[80%]">
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    msg.role === "child"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  } ${isFlagged ? "border-l-4 border-red-500 bg-red-50" : ""}`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
