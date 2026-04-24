import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { childrenApi } from "@/api/children";
import { childAuthApi } from "@/api/child-auth";
import type {
  PresetName,
  PresetSliders,
  CalibrationAnswer,
} from "@child-safe-llm/shared";
import type { UpdateChildRequest } from "@/api/types";

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
      sliderOverrides?: Partial<PresetSliders>;
      calibrationAnswers?: CalibrationAnswer[];
    }) => childrenApi.create(data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["children", variables.parentId],
      });
    },
  });
};

// --- Phase 6: Parent Dashboard ---

export const childConfigOptions = (childId: string | undefined) =>
  queryOptions({
    queryKey: ["child-config", childId],
    queryFn: () => childrenApi.getConfig(childId!),
    enabled: !!childId,
  });

export const useChildConfig = (childId: string | undefined) =>
  useQuery(childConfigOptions(childId));

export const childStatsOptions = (childId: string | undefined) =>
  queryOptions({
    queryKey: ["child-stats", childId],
    queryFn: () => childrenApi.getStats(childId!),
    enabled: !!childId,
  });

export const useChildStats = (childId: string | undefined) =>
  useQuery(childStatsOptions(childId));

export const useUpdateChild = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      childId,
      data,
    }: {
      childId: string;
      data: UpdateChildRequest;
    }) => childrenApi.update(childId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
    },
  });
};

export const useUpdatePreset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      childId,
      sliders,
    }: {
      childId: string;
      sliders: Partial<PresetSliders>;
    }) => childrenApi.updatePreset(childId, sliders),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["child-stats", variables.childId],
      });
      queryClient.invalidateQueries({
        queryKey: ["child-config", variables.childId],
      });
    },
  });
};

export const useUpdateCalibration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      childId,
      answers,
    }: {
      childId: string;
      answers: CalibrationAnswer[];
    }) => childrenApi.updateCalibration(childId, answers),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["child-stats", variables.childId],
      });
    },
  });
};
