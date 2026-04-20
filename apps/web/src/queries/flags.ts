import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { flagsApi } from "@/api/flags";

export const flagsByParentOptions = (
  parentId: string | undefined,
  childId?: string,
) =>
  queryOptions({
    queryKey: ["flags", parentId, childId],
    queryFn: () => flagsApi.getByParent(parentId!, childId),
    enabled: !!parentId,
  });

export const useFlagsByParent = (
  parentId: string | undefined,
  childId?: string,
) => useQuery(flagsByParentOptions(parentId, childId));

export const useMarkFlagReviewed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ flagId, reviewed }: { flagId: string; reviewed: boolean }) =>
      flagsApi.markReviewed(flagId, { reviewed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flags"] });
    },
  });
};
