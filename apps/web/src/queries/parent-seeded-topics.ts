import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { topicsApi } from "@/api/parent-seeded-topics";

export const parentSeededTopicsOptions = (childId: string | undefined) =>
  queryOptions({
    queryKey: ["parent-seeded-topics", childId],
    queryFn: () => topicsApi.list(childId!),
    enabled: !!childId,
  });

export const useParentSeededTopics = (childId: string | undefined) =>
  useQuery(parentSeededTopicsOptions(childId));

export const useCreateParentSeededTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ childId, topic }: { childId: string; topic: string }) =>
      topicsApi.create(childId, topic),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["parent-seeded-topics", variables.childId],
      });
    },
  });
};

export const useDeleteParentSeededTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ childId, topicId }: { childId: string; topicId: string }) =>
      topicsApi.delete(childId, topicId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["parent-seeded-topics", variables.childId],
      });
    },
  });
};
