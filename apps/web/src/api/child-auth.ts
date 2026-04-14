import type {
  ChildLoginPasswordRequest,
  ChildLoginPinRequest,
  ChildLoginResponse,
  GetChildrenForDeviceResponse,
} from "./types";

export const childAuthApi = {
  loginWithPassword: async (
    data: ChildLoginPasswordRequest,
  ): Promise<ChildLoginResponse> => {
    const res = await fetch("/api/child-auth/login-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  loginWithPin: async (
    data: ChildLoginPinRequest,
  ): Promise<ChildLoginResponse> => {
    const res = await fetch("/api/child-auth/login-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getChildrenForDevice: async (
    deviceToken: string,
  ): Promise<GetChildrenForDeviceResponse> => {
    const res = await fetch(
      `/api/child-auth/device-children?deviceToken=${encodeURIComponent(deviceToken)}`,
    );
    return res.json();
  },
};
