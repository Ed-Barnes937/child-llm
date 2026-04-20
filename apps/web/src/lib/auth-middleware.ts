import { loadEnv, type Plugin } from "vite";

const readBody = (req: import("http").IncomingMessage): Promise<string> =>
  new Promise<string>((resolve) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
  });

const toHeaders = (raw: import("http").IncomingHttpHeaders): Headers => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(raw)) {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }
  return headers;
};

export const serverMiddleware = (): Plugin => {
  return {
    name: "server-middleware",
    configureServer(server) {
      const env = loadEnv("development", server.config.root + "/../..", "");
      Object.assign(process.env, env);

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

        if (!req.url?.startsWith("/api/")) return next();

        try {
          // Better Auth middleware
          if (req.url?.startsWith("/api/auth")) {
            const { auth } = await server.ssrLoadModule("/src/lib/auth.ts");
            const headers = toHeaders(req.headers);
            const body = await readBody(req);

            const request = new Request(url, {
              method: req.method,
              headers,
              body:
                req.method !== "GET" && req.method !== "HEAD"
                  ? body
                  : undefined,
            });

            const response = await auth.handler(request);
            res.statusCode = response.status;
            response.headers.forEach((value: string, key: string) => {
              res.setHeader(key, value);
            });
            res.end(await response.text());
            return;
          }

          // Children API
          if (req.url?.startsWith("/api/children")) {
            const handlers = await server.ssrLoadModule(
              "/src/server/api-handlers.ts",
            );

            // GET /api/children/:childId/config
            const configMatch = url.pathname.match(
              /^\/api\/children\/([^/]+)\/config$/,
            );
            if (configMatch && req.method === "GET") {
              const childId = configMatch[1];
              const result = await handlers.handleGetChildConfig(childId);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
              return;
            }

            const body = await readBody(req);

            if (req.method === "POST") {
              const data = JSON.parse(body);
              const result = await handlers.handleCreateChild(data);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
              return;
            }

            // GET /api/children?parentId=x
            const parentId = url.searchParams.get("parentId");
            if (!parentId) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "parentId required" }));
              return;
            }
            const result = await handlers.handleGetChildren(parentId);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
            return;
          }

          // Child Auth API
          if (req.url?.startsWith("/api/child-auth/")) {
            const handlers = await server.ssrLoadModule(
              "/src/server/api-handlers.ts",
            );
            const body = await readBody(req);

            if (req.url.startsWith("/api/child-auth/login-password")) {
              const data = JSON.parse(body);
              const result = await handlers.handleChildLoginWithPassword(data);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
              return;
            }

            if (req.url.startsWith("/api/child-auth/login-pin")) {
              const data = JSON.parse(body);
              const result = await handlers.handleChildLoginWithPin(data);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
              return;
            }

            if (req.url.startsWith("/api/child-auth/device-children")) {
              const deviceToken = url.searchParams.get("deviceToken");
              if (!deviceToken) {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ children: [] }));
                return;
              }
              const result =
                await handlers.handleGetChildrenForDevice(deviceToken);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
              return;
            }
          }

          // Flags API
          if (req.url?.startsWith("/api/flags")) {
            const handlers = await server.ssrLoadModule(
              "/src/server/api-handlers.ts",
            );

            if (req.method === "POST") {
              const body = await readBody(req);
              const data = JSON.parse(body);
              const result = await handlers.handleCreateFlag(data);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
              return;
            }
          }

          // Conversations API
          if (req.url?.startsWith("/api/conversations")) {
            const handlers = await server.ssrLoadModule(
              "/src/server/api-handlers.ts",
            );

            // GET /api/conversations/:id/summary
            const summaryMatch = url.pathname.match(
              /^\/api\/conversations\/([^/]+)\/summary$/,
            );
            if (summaryMatch && req.method === "GET") {
              const result = await handlers.handleGetConversationSummary(
                summaryMatch[1],
              );
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
              return;
            }

            // POST /api/conversations/:id/summarise
            const summariseMatch = url.pathname.match(
              /^\/api\/conversations\/([^/]+)\/summarise$/,
            );
            if (summariseMatch && req.method === "POST") {
              const result = await handlers.handleSummariseAndPurge(
                summariseMatch[1],
              );
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
              return;
            }

            // GET/POST /api/conversations/:id/messages
            const messagesMatch = url.pathname.match(
              /^\/api\/conversations\/([^/]+)\/messages$/,
            );
            if (messagesMatch) {
              const conversationId = messagesMatch[1];
              if (req.method === "POST") {
                const body = await readBody(req);
                const data = JSON.parse(body);
                const result = await handlers.handleSaveMessage(
                  conversationId,
                  data,
                );
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(result));
                return;
              }
              // GET
              const result =
                await handlers.handleGetConversationMessages(conversationId);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
              return;
            }

            // DELETE /api/conversations/:id
            const deleteMatch = url.pathname.match(
              /^\/api\/conversations\/([^/]+)$/,
            );
            if (deleteMatch && req.method === "DELETE") {
              const result = await handlers.handleDeleteConversation(
                deleteMatch[1],
              );
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
              return;
            }

            // POST /api/conversations
            if (req.method === "POST") {
              const body = await readBody(req);
              const data = JSON.parse(body);
              const result = await handlers.handleCreateConversation(data);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
              return;
            }

            // GET /api/conversations?childId=x
            const childId = url.searchParams.get("childId");
            if (!childId) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "childId required" }));
              return;
            }
            const result = await handlers.handleGetConversations(childId);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
            return;
          }

          // Chat streaming API
          if (req.url?.startsWith("/api/chat/stream")) {
            const handlers = await server.ssrLoadModule(
              "/src/server/api-handlers.ts",
            );
            const body = await readBody(req);
            const data = JSON.parse(body);

            const pipelineResponse = await handlers.handleChatStream(data);

            if (!pipelineResponse.ok || !pipelineResponse.body) {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: "Pipeline error" }));
              return;
            }

            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            const reader = pipelineResponse.body.getReader();
            const pump = async () => {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
              res.end();
            };
            pump().catch(() => res.end());
            return;
          }

          next();
        } catch (err) {
          console.error(`[API Error] ${req.method} ${req.url}:`, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        }
      });
    },
  };
};
