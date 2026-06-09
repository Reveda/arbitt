import { useCallback } from "react";
import { useCurrentUserQuery } from "@/store/api/authApi";
import { getQueryErrorMessage } from "@/store/api/queryError";

export function useCurrentUser() {
  const currentUserQuery = useCurrentUserQuery();

  const refetch = useCallback(async () => {
    const response = await currentUserQuery.refetch();

    if ("data" in response && response.data) {
      return response.data.data.user;
    }

    throw new Error(getQueryErrorMessage(response.error, "Unable to load account details.") ?? "Unable to load account details.");
  }, [currentUserQuery]);

  return {
    error: getQueryErrorMessage(currentUserQuery.error, "Unable to load account details."),
    isLoading: currentUserQuery.isLoading || currentUserQuery.isFetching,
    refetch,
    user: currentUserQuery.data?.data.user ?? null
  };
}
