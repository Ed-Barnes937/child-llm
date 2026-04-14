import type {
  CreateChildRequest,
  CreateChildResponse,
  ChildSummary,
} from "./types";

export const childrenApi = {
  create: async (data: CreateChildRequest): Promise<CreateChildResponse> => {
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getByParent: async (parentId: string): Promise<ChildSummary[]> => {
    const res = await fetch(
      `/api/children?parentId=${encodeURIComponent(parentId)}`,
    );
    return res.json();
  },
};
