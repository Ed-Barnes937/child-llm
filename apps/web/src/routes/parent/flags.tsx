import { createFileRoute } from "@tanstack/react-router";

const FlagsPage = () => {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">Flags</h1>
      <p className="text-muted-foreground mt-2">
        Flag review coming soon in a future slice.
      </p>
    </div>
  );
};

export const Route = createFileRoute("/parent/flags")({
  component: FlagsPage,
});
