const DEVICE_TOKEN_KEY = "child-safe-llm-device-token";

export function getDeviceToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEVICE_TOKEN_KEY);
}

export function setDeviceToken(token: string): void {
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
}

export function generateDeviceToken(): string {
  return crypto.randomUUID();
}
