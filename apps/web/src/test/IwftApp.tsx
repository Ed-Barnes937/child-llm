import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createRouter,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
} from "@tanstack/react-router";
import "../styles.css";

// Import page components directly — avoids the SSR root route
// that renders <html>/<body>/<Scripts> (which blocks Playwright CT actions).
import { Route as IndexRouteImport } from "../routes/index";
import { Route as RegisterRouteImport } from "../routes/parent/register";
import { Route as LoginRouteImport } from "../routes/parent/login";
import { Route as OnboardingRouteImport } from "../routes/parent/onboarding";
import { Route as DashboardRouteImport } from "../routes/parent/dashboard";
import { Route as ChildLoginRouteImport } from "../routes/child/login";
import { Route as ChildHomeRouteImport } from "../routes/child/home";
import { Route as ChatNewRouteImport } from "../routes/child/chat/new";
import { Route as ChatContinueRouteImport } from "../routes/child/chat/$conversationId";
import { Route as SettingsRouteImport } from "../routes/parent/settings";
import { Route as ChildrenListRouteImport } from "../routes/parent/children";
import { Route as ChildSettingsRouteImport } from "../routes/parent/children.$childId";

// Clean root route: no <html>/<body>/<Scripts>, just renders children
const testRootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Recreate each route parented to the test root
const indexRoute = createRoute({
  getParentRoute: () => testRootRoute,
  path: "/",
  component: IndexRouteImport.options.component,
});

const registerRoute = createRoute({
  getParentRoute: () => testRootRoute,
  path: "/parent/register",
  component: RegisterRouteImport.options.component,
});

const loginRoute = createRoute({
  getParentRoute: () => testRootRoute,
  path: "/parent/login",
  component: LoginRouteImport.options.component,
});

const onboardingRoute = createRoute({
  getParentRoute: () => testRootRoute,
  path: "/parent/onboarding",
  component: OnboardingRouteImport.options.component,
});

const dashboardRoute = createRoute({
  getParentRoute: () => testRootRoute,
  path: "/parent/dashboard",
  component: DashboardRouteImport.options.component,
});

const childLoginRoute = createRoute({
  getParentRoute: () => testRootRoute,
  path: "/child/login",
  component: ChildLoginRouteImport.options.component,
});

const childHomeRoute = createRoute({
  getParentRoute: () => testRootRoute,
  path: "/child/home",
  component: ChildHomeRouteImport.options.component,
});

const chatNewRoute = createRoute({
  getParentRoute: () => testRootRoute,
  path: "/child/chat/new",
  component: ChatNewRouteImport.options.component,
});

const chatContinueRoute = createRoute({
  getParentRoute: () => testRootRoute,
  path: "/child/chat/$conversationId",
  component: ChatContinueRouteImport.options.component,
});

const settingsRoute = createRoute({
  getParentRoute: () => testRootRoute,
  path: "/parent/settings",
  component: SettingsRouteImport.options.component,
});

const childrenListRoute = createRoute({
  getParentRoute: () => testRootRoute,
  path: "/parent/children",
  component: ChildrenListRouteImport.options.component,
});

const childSettingsRoute = createRoute({
  getParentRoute: () => testRootRoute,
  path: "/parent/children/$childId",
  component: ChildSettingsRouteImport.options.component,
});

const testRouteTree = testRootRoute.addChildren([
  indexRoute,
  registerRoute,
  loginRoute,
  onboardingRoute,
  dashboardRoute,
  childLoginRoute,
  childHomeRoute,
  chatNewRoute,
  chatContinueRoute,
  settingsRoute,
  childrenListRoute,
  childSettingsRoute,
]);

interface IwftAppProps {
  initialPath?: string;
}

const IwftApp = ({ initialPath = "/" }: IwftAppProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const memoryHistory = createMemoryHistory({
    initialEntries: [initialPath],
  });

  const router = createRouter({
    routeTree: testRouteTree,
    history: memoryHistory,
  });

  return (
    <QueryClientProvider client={queryClient}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <RouterProvider router={router as any} />
    </QueryClientProvider>
  );
};

export default IwftApp;
