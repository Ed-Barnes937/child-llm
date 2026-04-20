import type {
  CreateChildRequest,
  CreateChildResponse,
  ChildSummary,
  ChildStats,
  UpdateChildRequest,
  ChildConfigResponse,
} from "./types";
import type { PresetSliders, CalibrationAnswer } from "@child-safe-llm/shared";

const ensureOk = async (res: Response, context: string): Promise<void> => {
  if (!res.ok) {
    throw new Error(`${context} failed: ${res.status} ${res.statusText}`);
  }
};

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

  getStats: async (childId: string): Promise<ChildStats> => {
    const res = await fetch(
      `/api/children/${encodeURIComponent(childId)}/stats`,
    );
    await ensureOk(res, "Get child stats");
    return res.json();
  },

  update: async (
    childId: string,
    data: UpdateChildRequest,
  ): Promise<ChildSummary> => {
    const res = await fetch(`/api/children/${encodeURIComponent(childId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await ensureOk(res, "Update child");
    return res.json();
  },

  updatePreset: async (
    childId: string,
    sliders: Partial<PresetSliders>,
  ): Promise<{ sliders: PresetSliders }> => {
    const res = await fetch(
      `/api/children/${encodeURIComponent(childId)}/preset`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sliders),
      },
    );
    await ensureOk(res, "Update preset");
    return res.json();
  },

  updateCalibration: async (
    childId: string,
    answers: CalibrationAnswer[],
  ): Promise<{ calibrationAnswers: CalibrationAnswer[] }> => {
    const res = await fetch(
      `/api/children/${encodeURIComponent(childId)}/calibration`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      },
    );
    await ensureOk(res, "Update calibration");
    return res.json();
  },

  getConfig: async (childId: string): Promise<ChildConfigResponse> => {
    const res = await fetch(
      `/api/children/${encodeURIComponent(childId)}/config`,
    );
    await ensureOk(res, "Get child config");
    return res.json();
  },
};
