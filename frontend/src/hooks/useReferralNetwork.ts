import { useCallback, useEffect, useState } from "react";
import {
  referralService,
  type ReferralMembersParams,
  type ReferralMembersResponse,
  type ReferralTree
} from "@/services/referral.service";

type ReferralNetworkState = {
  data: ReferralTree | null;
  error: string | null;
  isLoading: boolean;
};

export function useReferralNetwork() {
  const [state, setState] = useState<ReferralNetworkState>({
    data: null,
    error: null,
    isLoading: true
  });

  const refetch = useCallback(async () => {
    setState((current) => ({ ...current, error: null, isLoading: true }));

    try {
      const response = await referralService.getTree();
      setState({ data: response.data, error: null, isLoading: false });
      return response.data;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load referral network.";
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

export function useReferralMembers(params: ReferralMembersParams) {
  const [state, setState] = useState<{
    data: ReferralMembersResponse | null;
    error: string | null;
    isLoading: boolean;
  }>({
    data: null,
    error: null,
    isLoading: true
  });

  const refetch = useCallback(async () => {
    setState((current) => ({ ...current, error: null, isLoading: true }));

    try {
      const response = await referralService.listMembers(params);
      setState({ data: response.data, error: null, isLoading: false });
      return response.data;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load team members.";
      setState({ data: null, error: message, isLoading: false });
      throw caughtError;
    }
  }, [params.limit, params.page, params.search]);

  useEffect(() => {
    void refetch().catch(() => undefined);
  }, [refetch]);

  return {
    ...state,
    refetch
  };
}
