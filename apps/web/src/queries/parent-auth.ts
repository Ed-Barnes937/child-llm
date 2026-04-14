import { queryOptions, useQuery } from "@tanstack/react-query";
import { parentAuth } from "@/api/parent-auth";

export const parentSessionOptions = () => {
  return queryOptions({
    queryKey: ["parent-session"],
    queryFn: () => parentAuth.getSession(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useParentSession = () => {
  return useQuery(parentSessionOptions());
};
