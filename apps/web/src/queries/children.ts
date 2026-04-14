import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { childrenApi } from "@/api/children";
import { childAuthApi } from "@/api/child-auth";
import type { PresetName } from "@child-safe-llm/shared";

export const childrenByParentOptions = (parentId: string | undefined) => {
  return queryOptions({
    queryKey: ["children", parentId],
    queryFn: () => childrenApi.getByParent(parentId!),
    enabled: !!parentId,
  });
};

export const useChildrenByParent = (parentId: string | undefined) => {
  return useQuery(childrenByParentOptions(parentId));
};

export const childrenByDeviceOptions = (deviceToken: string | null) => {
  return queryOptions({
    queryKey: ["children", "device", deviceToken],
    queryFn: () => childAuthApi.getChildrenForDevice(deviceToken!),
    enabled: !!deviceToken,
  });
};

export const useChildrenByDevice = (deviceToken: string | null) => {
  return useQuery(childrenByDeviceOptions(deviceToken));
};

export const useCreateChild = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      parentId: string;
      displayName: string;
      presetName: PresetName;
      pin: string;
    }) => childrenApi.create(data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["children", variables.parentId],
      });
    },
  });
};
