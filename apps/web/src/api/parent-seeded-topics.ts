import type { ParentSeededTopic } from "./types";
import { ensureOk } from "./fetch-utils";

export const topicsApi = {
  list: async (childId: string): Promise<ParentSeededTopic[]> => {
    const res = await fetch(
      `/api/children/${encodeURIComponent(childId)}/topics`,
    );
    await ensureOk(res, "List topics");
    return res.json();
  },

  create: async (
    childId: string,
    topic: string,
  ): Promise<ParentSeededTopic> => {
    const res = await fetch(
      `/api/children/${encodeURIComponent(childId)}/topics`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      },
    );
    await ensureOk(res, "Create topic");
    return res.json();
  },

  delete: async (childId: string, topicId: string): Promise<void> => {
    const res = await fetch(
      `/api/children/${encodeURIComponent(childId)}/topics/${encodeURIComponent(topicId)}`,
      { method: "DELETE" },
    );
    await ensureOk(res, "Delete topic");
  },
};
