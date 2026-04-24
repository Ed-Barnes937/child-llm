import type { FlagDetail, UpdateFlagRequest } from "./types";

const ensureOk = async (res: Response, context: string): Promise<void> => {
  if (!res.ok) {
    throw new Error(`${context} failed: ${res.status} ${res.statusText}`);
  }
};

export const flagsApi = {
  getByParent: async (
    parentId: string,
    childId?: string,
  ): Promise<FlagDetail[]> => {
    const params = new URLSearchParams({ parentId });
    if (childId) params.set("childId", childId);
    const res = await fetch(`/api/flags?${params}`);
    await ensureOk(res, "Get flags");
    return res.json();
  },

  markReviewed: async (
    flagId: string,
    data: UpdateFlagRequest,
  ): Promise<FlagDetail> => {
    const res = await fetch(`/api/flags/${encodeURIComponent(flagId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await ensureOk(res, "Update flag");
    return res.json();
  },
};
