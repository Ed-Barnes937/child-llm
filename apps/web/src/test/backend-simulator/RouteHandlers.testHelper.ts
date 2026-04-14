import type { BackendSimulatorDb } from "./BackendSimulatorDb.testHelper";
import type {
  RouteDefinition,
  HttpRequest,
  RouteResponse,
} from "./Route.testHelper";
import { get, post } from "./Route.testHelper";
import { EndpointKey } from "./Endpoint.testHelper";
import { handleEndpointBehaviour } from "./EndpointBehaviourManager.testHelper";
import type { PresetName } from "@child-safe-llm/shared";

const json = (data: unknown, status = 200): RouteResponse => ({
  status,
  body: JSON.stringify(data),
});

const extractSessionToken = (
  headers: Record<string, string>,
): string | null => {
  const cookie = headers["cookie"] ?? "";
  const match = cookie.match(/better-auth\.session_token=([^;]+)/);
  return match ? match[1] : null;
};

export const createAuthRoutes = (
  db: BackendSimulatorDb,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): RouteDefinition<any>[] => [
  post(
    "/sign-up/email",
    (req: HttpRequest<{ name: string; email: string; password: string }>) =>
      handleEndpointBehaviour(
        db.endpointBehaviourManager.getBehaviour(EndpointKey.AUTH_SIGN_UP),
        () => {
          const existing = db.findParentByEmail(req.body.email);
          if (existing) return json({ message: "User already exists" }, 400);

          const parent = db.createParent(req.body);
          const session = db.createSession(parent.id);

          return {
            status: 200,
            headers: {
              "Set-Cookie": `better-auth.session_token=${session.token}; Path=/; HttpOnly`,
            },
            body: JSON.stringify({
              user: { id: parent.id, name: parent.name, email: parent.email },
            }),
          };
        },
      ),
  ),

  post(
    "/sign-in/email",
    (req: HttpRequest<{ email: string; password: string }>) =>
      handleEndpointBehaviour(
        db.endpointBehaviourManager.getBehaviour(EndpointKey.AUTH_SIGN_IN),
        () => {
          const parent = db.findParentByEmail(req.body.email);
          if (!parent || parent.password !== req.body.password) {
            return json({ message: "Invalid email or password." }, 401);
          }

          const session = db.createSession(parent.id);
          return {
            status: 200,
            headers: {
              "Set-Cookie": `better-auth.session_token=${session.token}; Path=/; HttpOnly`,
            },
            body: JSON.stringify({
              user: { id: parent.id, name: parent.name, email: parent.email },
            }),
          };
        },
      ),
  ),

  get("/get-session", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(EndpointKey.AUTH_GET_SESSION),
      () => {
        const token = extractSessionToken(req.headers);
        if (!token) return json(null, 401);

        const session = db.findSessionByToken(token);
        if (!session) return json(null, 401);

        const parent = db.parents.find((p) => p.id === session.userId);
        if (!parent) return json(null, 401);

        return json({
          session: { id: session.token, userId: parent.id },
          user: { id: parent.id, name: parent.name, email: parent.email },
        });
      },
    ),
  ),

  post("/sign-out", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(EndpointKey.AUTH_SIGN_OUT),
      () => {
        const token = extractSessionToken(req.headers);
        if (token) db.removeSession(token);
        return {
          status: 200,
          headers: {
            "Set-Cookie":
              "better-auth.session_token=; Path=/; HttpOnly; Max-Age=0",
          },
          body: JSON.stringify({ success: true }),
        };
      },
    ),
  ),
];

export const createChildrenRoutes = (
  db: BackendSimulatorDb,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): RouteDefinition<any>[] => [
  get("/children", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(EndpointKey.GET_CHILDREN),
      () => {
        const parentId = req.queryParams["parentId"];
        if (!parentId) return json({ error: "parentId required" }, 400);
        const kids = db.getChildrenByParent(parentId);
        return json(
          kids.map((c) => ({
            id: c.id,
            displayName: c.displayName,
            username: c.username,
            presetName: c.presetName,
          })),
        );
      },
    ),
  ),

  post(
    "/children",
    (
      req: HttpRequest<{
        parentId: string;
        displayName: string;
        presetName: PresetName;
        pin: string;
      }>,
    ) =>
      handleEndpointBehaviour(
        db.endpointBehaviourManager.getBehaviour(EndpointKey.CREATE_CHILD),
        () => {
          const child = db.createChild(req.body);
          return json({
            child: {
              id: child.id,
              username: child.username,
              displayName: child.displayName,
            },
          });
        },
      ),
  ),
];

export const createChildAuthRoutes = (
  db: BackendSimulatorDb,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): RouteDefinition<any>[] => [
  post(
    "/child-auth/login-password",
    (
      req: HttpRequest<{
        username: string;
        password: string;
        deviceToken: string;
      }>,
    ) =>
      handleEndpointBehaviour(
        db.endpointBehaviourManager.getBehaviour(
          EndpointKey.CHILD_LOGIN_PASSWORD,
        ),
        () => {
          const child = db.findChildByUsername(req.body.username);
          if (!child || child.passwordHash !== req.body.password) {
            return json({ error: "Invalid username or password." });
          }

          db.registerDevice(child.parentId, req.body.deviceToken);

          return json({
            child: {
              id: child.id,
              displayName: child.displayName,
              username: child.username,
              presetName: child.presetName,
              parentId: child.parentId,
            },
          });
        },
      ),
  ),

  post(
    "/child-auth/login-pin",
    (req: HttpRequest<{ childId: string; pin: string; deviceToken: string }>) =>
      handleEndpointBehaviour(
        db.endpointBehaviourManager.getBehaviour(EndpointKey.CHILD_LOGIN_PIN),
        () => {
          const child = db.findChildById(req.body.childId);
          if (!child) return json({ error: "Child not found." });
          if (child.pinHash !== req.body.pin)
            return json({ error: "Incorrect PIN." });

          return json({
            child: {
              id: child.id,
              displayName: child.displayName,
              username: child.username,
              presetName: child.presetName,
              parentId: child.parentId,
            },
          });
        },
      ),
  ),

  get("/child-auth/device-children", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(EndpointKey.DEVICE_CHILDREN),
      () => {
        const deviceToken = req.queryParams["deviceToken"];
        if (!deviceToken) return json({ children: [] });
        const kids = db.getChildrenByDevice(deviceToken);
        return json({
          children: kids.map((c) => ({
            id: c.id,
            displayName: c.displayName,
            presetName: c.presetName,
          })),
        });
      },
    ),
  ),
];

export const createChatRoutes = (
  db: BackendSimulatorDb,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): RouteDefinition<any>[] => [
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  post("/chat/stream", (_req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(EndpointKey.CHAT_STREAM),
      () => {
        const tokens = [
          "The ",
          "sun ",
          "is ",
          "a ",
          "big ",
          "star ",
          "that ",
          "gives ",
          "us ",
          "light ",
          "and ",
          "warmth.",
        ];
        const sseLines = tokens.map(
          (t) => `data: ${JSON.stringify({ token: t })}\n\n`,
        );
        sseLines.push("data: [DONE]\n\n");

        return {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
          body: sseLines.join(""),
        };
      },
    ),
  ),
];
