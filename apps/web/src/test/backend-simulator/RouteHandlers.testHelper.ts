import type { BackendSimulatorDb } from "./BackendSimulatorDb.testHelper";
import type {
  RouteDefinition,
  HttpRequest,
  RouteResponse,
} from "./Route.testHelper";
import { get, post, patch, put, del } from "./Route.testHelper";
import { EndpointKey } from "./Endpoint.testHelper";
import { handleEndpointBehaviour } from "./EndpointBehaviourManager.testHelper";
import type {
  PresetName,
  PresetSliders,
  CalibrationAnswer,
  FlagType,
} from "@child-safe-llm/shared";
import type { MockFlag } from "./BackendSimulatorDb.testHelper";

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
  get("/children/:childId/config", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(EndpointKey.GET_CHILD_CONFIG),
      () => {
        const { childId } = req.pathParams;
        return json(db.getChildConfig(childId));
      },
    ),
  ),

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
        sliderOverrides?: Partial<PresetSliders>;
        calibrationAnswers?: CalibrationAnswer[];
      }>,
    ) =>
      handleEndpointBehaviour(
        db.endpointBehaviourManager.getBehaviour(EndpointKey.CREATE_CHILD),
        () => {
          const child = db.createChild(req.body);
          if (req.body.calibrationAnswers) {
            db.storeCalibrationAnswers(child.id, req.body.calibrationAnswers);
          }
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
        const scenario = db.getChatStreamScenario();
        const tokens = scenario?.tokens ?? [
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
        const sseLines: string[] = [];

        if (scenario?.flag) {
          sseLines.push(`data: ${JSON.stringify({ flag: scenario.flag })}\n\n`);
        }

        for (const t of tokens) {
          sseLines.push(`data: ${JSON.stringify({ token: t })}\n\n`);
        }
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

export const createConversationRoutes = (
  db: BackendSimulatorDb,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): RouteDefinition<any>[] => [
  get("/conversations/:conversationId/summary", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(
        EndpointKey.GET_CONVERSATION_SUMMARY,
      ),
      () => {
        const { conversationId } = req.pathParams;
        return json({ summary: db.getConversationSummary(conversationId) });
      },
    ),
  ),

  post("/conversations/:conversationId/summarise", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(EndpointKey.SUMMARISE_AND_PURGE),
      () => {
        const { conversationId } = req.pathParams;
        const summary = db.summariseAndPurge(conversationId);
        return json({ summary });
      },
    ),
  ),

  post(
    "/conversations",
    (req: HttpRequest<{ childId: string; title?: string }>) =>
      handleEndpointBehaviour(
        db.endpointBehaviourManager.getBehaviour(
          EndpointKey.CREATE_CONVERSATION,
        ),
        () => {
          const conversation = db.createConversation(req.body);
          return json(conversation);
        },
      ),
  ),

  get("/conversations", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(EndpointKey.GET_CONVERSATIONS),
      () => {
        const childId = req.queryParams["childId"];
        if (!childId) return json({ error: "childId required" }, 400);
        return json(db.getConversationsByChild(childId));
      },
    ),
  ),

  get("/conversations/:conversationId/messages", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(
        EndpointKey.GET_CONVERSATION_MESSAGES,
      ),
      () => {
        const { conversationId } = req.pathParams;
        return json(db.getMessagesByConversation(conversationId));
      },
    ),
  ),

  post(
    "/conversations/:conversationId/messages",
    (
      req: HttpRequest<{
        role: string;
        content: string;
        flagged?: boolean;
      }>,
    ) =>
      handleEndpointBehaviour(
        db.endpointBehaviourManager.getBehaviour(EndpointKey.SAVE_MESSAGE),
        () => {
          const { conversationId } = req.pathParams;
          const message = db.saveMessage({
            conversationId,
            ...req.body,
          });
          return json(message);
        },
      ),
  ),

  del("/conversations/:conversationId", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(EndpointKey.DELETE_CONVERSATION),
      () => {
        const { conversationId } = req.pathParams;
        db.deleteConversation(conversationId);
        return json({ success: true });
      },
    ),
  ),
];

export const createFlagRoutes = (
  db: BackendSimulatorDb,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): RouteDefinition<any>[] => [
  post(
    "/flags",
    (
      req: HttpRequest<{
        childId: string;
        conversationId?: string;
        messageId?: string;
        type: FlagType;
        reason: string;
        childMessage?: string;
        aiResponse?: string;
        topics?: string[];
      }>,
    ) =>
      handleEndpointBehaviour(
        db.endpointBehaviourManager.getBehaviour(EndpointKey.CREATE_FLAG),
        () => {
          const flag = db.createFlag(req.body);
          return json({ id: flag.id });
        },
      ),
  ),

  get("/flags", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(EndpointKey.GET_FLAGS),
      () => {
        const parentId = req.queryParams["parentId"];
        if (!parentId) return json({ error: "parentId required" }, 400);
        const childId = req.queryParams["childId"];
        const flags = db.getFlagsByParent(parentId, childId || undefined);
        const enriched = flags.map((f: MockFlag) => {
          const child = db.findChildById(f.childId);
          return {
            ...f,
            childDisplayName: child?.displayName ?? "Unknown",
          };
        });
        return json(enriched);
      },
    ),
  ),

  patch("/flags/:flagId", (req: HttpRequest<{ reviewed: boolean }>) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(EndpointKey.UPDATE_FLAG),
      () => {
        const { flagId } = req.pathParams;
        const flag = db.updateFlagReviewed(flagId, req.body.reviewed);
        if (!flag) return json({ error: "Flag not found" }, 404);
        return json(flag);
      },
    ),
  ),
];

export const createParentDashboardRoutes = (
  db: BackendSimulatorDb,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): RouteDefinition<any>[] => [
  get("/children/:childId/stats", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(EndpointKey.GET_CHILD_STATS),
      () => {
        const { childId } = req.pathParams;
        return json(db.getChildStats(childId));
      },
    ),
  ),

  patch(
    "/children/:childId",
    (
      req: HttpRequest<{
        displayName?: string;
        presetName?: PresetName;
        pin?: string;
      }>,
    ) =>
      handleEndpointBehaviour(
        db.endpointBehaviourManager.getBehaviour(EndpointKey.UPDATE_CHILD),
        () => {
          const { childId } = req.pathParams;
          const child = db.updateChild(childId, req.body);
          if (!child) return json({ error: "Child not found" }, 404);
          return json({
            id: child.id,
            displayName: child.displayName,
            username: child.username,
            presetName: child.presetName,
          });
        },
      ),
  ),

  put("/children/:childId/preset", (req: HttpRequest<Record<string, number>>) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(EndpointKey.UPDATE_PRESET),
      () => {
        const { childId } = req.pathParams;
        const sliders = db.updatePreset(childId, req.body);
        return json({ sliders });
      },
    ),
  ),

  put(
    "/children/:childId/calibration",
    (req: HttpRequest<{ answers: CalibrationAnswer[] }>) =>
      handleEndpointBehaviour(
        db.endpointBehaviourManager.getBehaviour(
          EndpointKey.UPDATE_CALIBRATION,
        ),
        () => {
          const { childId } = req.pathParams;
          db.updateCalibration(childId, req.body.answers);
          const answers = db.getCalibrationAnswers(childId);
          return json({
            calibrationAnswers: answers.map((a) => ({
              questionId: a.questionId,
              selectedLevel: a.selectedLevel,
              customAnswer: a.customAnswer,
            })),
          });
        },
      ),
  ),

  get("/children/:childId/topics", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(
        EndpointKey.GET_PARENT_SEEDED_TOPICS,
      ),
      () => {
        const { childId } = req.pathParams;
        return json(db.getParentSeededTopics(childId));
      },
    ),
  ),

  post("/children/:childId/topics", (req: HttpRequest<{ topic: string }>) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(
        EndpointKey.CREATE_PARENT_SEEDED_TOPIC,
      ),
      () => {
        const { childId } = req.pathParams;
        const topic = db.createParentSeededTopic(childId, req.body.topic);
        return json(topic);
      },
    ),
  ),

  del("/children/:childId/topics/:topicId", (req: HttpRequest) =>
    handleEndpointBehaviour(
      db.endpointBehaviourManager.getBehaviour(
        EndpointKey.DELETE_PARENT_SEEDED_TOPIC,
      ),
      () => {
        const { topicId } = req.pathParams;
        db.deleteParentSeededTopic(topicId);
        return json({ success: true });
      },
    ),
  ),
];
