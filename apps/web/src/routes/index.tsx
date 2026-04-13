import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Child Safe LLM</h1>
      <p className="text-muted-foreground">Welcome. The app is running.</p>
      <div className="flex gap-2">
        <Button>I&apos;m a parent</Button>
        <Button variant="outline">I&apos;m a child</Button>
      </div>
    </div>
  );
}
