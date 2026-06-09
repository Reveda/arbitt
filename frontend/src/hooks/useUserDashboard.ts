import { useCallback, useEffect, useState } from "react";
import { userDashboardService, type UserDashboardOverview } from "@/services/userDashboard.service";

type UserDashboardState = {
  data: UserDashboardOverview | null;
  error: string | null;
  isLoading: boolean;
};

export function useUserDashboard() {
  const [state, setState] = useState<UserDashboardState>({
    data: null,
    error: null,
    isLoading: true
  });

  const refetch = useCallback(async () => {
    setState((current) => ({ ...current, error: null, isLoading: true }));

    try {
      const response = await userDashboardService.getDashboard();
      setState({ data: response.data, error: null, isLoading: false });
      return response.data;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load dashboard.";
      setState({ data: null, error: message, isLoading: false });
      throw caughtError;
    }
  }, []);

  useEffect(() => {
    void refetch().catch(() => undefined);
  }, [refetch]);

  return {
    ...state,
    refetch
  };
}
