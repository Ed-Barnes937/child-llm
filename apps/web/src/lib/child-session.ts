import type { PresetName } from "@child-safe-llm/shared";

const CHILD_SESSION_KEY = "child-safe-llm-child-session";

export interface ChildSession {
  id: string;
  displayName: string;
  username: string;
  presetName: PresetName;
  parentId: string;
}

export const getChildSession = (): ChildSession | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(CHILD_SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const setChildSession = (session: ChildSession): void => {
  localStorage.setItem(CHILD_SESSION_KEY, JSON.stringify(session));
};

export const clearChildSession = (): void => {
  localStorage.removeItem(CHILD_SESSION_KEY);
};
