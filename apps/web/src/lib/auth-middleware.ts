import { loadEnv, type Plugin } from "vite";

export function serverMiddleware(): Plugin {
  return {
    name: "server-middleware",
    configureServer(server) {
      // Load .env from the monorepo root into process.env so that
      // ssrLoadModule'd modules (auth.ts, etc.) can read DATABASE_URL etc.
      const env = loadEnv("development", server.config.root + "/../..", "");
      Object.assign(process.env, env);
      server.middlewares.use(async (req, res, next) => {
        // Better Auth middleware
        if (req.url?.startsWith("/api/auth")) {
          const { auth } = await server.ssrLoadModule("/src/lib/auth.ts");
          const url = new URL(req.url, `http://${req.headers.host}`);
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value) {
              headers.set(
                key,
                Array.isArray(value) ? value.join(", ") : value,
              );
            }
          }

          const body = await new Promise<string>((resolve) => {
            let data = "";
            req.on("data", (chunk: Buffer) => {
              data += chunk.toString();
            });
            req.on("end", () => resolve(data));
          });

          const request = new Request(url, {
            method: req.method,
            headers,
            body:
              req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
          });

          const response = await auth.handler(request);

          res.statusCode = response.status;
          response.headers.forEach((value: string, key: string) => {
            res.setHeader(key, value);
          });

          const responseBody = await response.text();
          res.end(responseBody);
          return;
        }

        next();
      });
    },
  };
}
