import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

const port = Number(process.env.PORT) || 3001;

console.log(`Pipeline service running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
