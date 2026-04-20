import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  canSubmit: boolean;
  extraAction?: React.ReactNode;
}

export const ChatInput = ({
  value,
  onChange,
  onSubmit,
  disabled,
  canSubmit,
  extraAction,
}: ChatInputProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="border-border border-t px-4 py-3">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-lg gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a message..."
          disabled={disabled}
          autoFocus
        />
        {extraAction}
        <Button type="submit" disabled={disabled || !canSubmit}>
          Send
        </Button>
      </form>
    </div>
  );
};
