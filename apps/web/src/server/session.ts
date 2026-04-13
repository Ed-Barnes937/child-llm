import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

export const getParentSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({
      headers: headers as Record<string, string>,
    });
    return session;
  },
);
