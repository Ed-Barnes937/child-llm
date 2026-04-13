import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Child Safe LLM</h1>
        <p className="text-muted-foreground max-w-md text-lg">
          A safe, parent-controlled AI chat experience for children.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          to="/parent/login"
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          I'm a parent
        </Link>
        <Link
          to="/child/login"
          className={buttonVariants({
            size: "lg",
            variant: "outline",
            className: "w-full",
          })}
        >
          I'm a child
        </Link>
      </div>

      <p className="text-muted-foreground text-sm">
        New here?{" "}
        <Link
          to="/parent/register"
          className="text-primary underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
