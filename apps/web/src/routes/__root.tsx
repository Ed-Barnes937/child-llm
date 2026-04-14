import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { buttonVariants } from "@/components/ui/button";
import "../styles.css";

const queryClient = new QueryClient();

const RootComponent = () => {
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </RootDocument>
  );
};

const RootErrorComponent = ({ error, reset }: ErrorComponentProps) => {
  return (
    <RootDocument>
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred."}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={reset}
              className={buttonVariants({ variant: "outline" })}
            >
              Try again
            </button>
            <Link to="/" className={buttonVariants()}>
              Go home
            </Link>
          </div>
        </div>
      </div>
    </RootDocument>
  );
};

const NotFoundComponent = () => {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className={buttonVariants()}>
          Go home
        </Link>
      </div>
    </div>
  );
};

const RootDocument = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Child Safe LLM" },
    ],
  }),
  component: RootComponent,
  errorComponent: RootErrorComponent,
  notFoundComponent: NotFoundComponent,
});
