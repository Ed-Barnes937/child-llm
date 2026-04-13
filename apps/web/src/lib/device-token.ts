const DEVICE_TOKEN_KEY = "child-safe-llm-device-token";

export const getDeviceToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEVICE_TOKEN_KEY);
};

export const setDeviceToken = (token: string): void => {
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
};

export const generateDeviceToken = (): string => {
  return crypto.randomUUID();
};
