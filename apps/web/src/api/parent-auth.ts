import type { ParentSession } from "./types";

export const parentAuth = {
  signUp: async (data: { name: string; email: string; password: string }) => {
    const res = await fetch("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: { message: body.message ?? "Sign up failed" } };
    }
    return { error: null };
  },

  signIn: async (data: { email: string; password: string }) => {
    const res = await fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: { message: body.message ?? "Invalid email or password." } };
    }
    return { error: null };
  },

  signOut: async () => {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "include",
    });
  },

  getSession: async (): Promise<ParentSession | null> => {
    const res = await fetch("/api/auth/get-session", {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.session) return null;
    return { user: data.user };
  },
};
