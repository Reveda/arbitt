import { useCallback, useEffect, useState } from "react";
import type { ApiSuccessResponse } from "@/api/types";
import {
  adminService,
  type AdminDepositsParams,
  type AdminPayoutsParams,
  type AdminReferralsParams,
  type AdminReferralNetwork,
  type AdminUsersParams,
  type AdminUsersResponse,
  type AdminWalletsParams,
  type AdminWalletsResponse,
  type AdminWithdrawalsParams,
  type AdminWithdrawalsResponse,
  type AdminTransactionsParams,
  type AdminTransactionsResponse
} from "@/services/admin.service";
import {
  useAdminDepositsQuery as useAdminDepositsRtkQuery,
  useAdminOverviewQuery,
  useAdminPayoutsQuery as useAdminPayoutsRtkQuery,
  type AdminOverviewFilter,
} from "@/store/api/adminApi";
import { getQueryErrorMessage } from "@/store/api/queryError";

type QueryState<TData> = {
  data: TData | null;
  error: string | null;
  isLoading: boolean;
};

export function useAdminOverview(filter?: AdminOverviewFilter) {
  const adminOverviewQuery = useAdminOverviewQuery(filter ?? undefined);
  const refetch = useCallback(async () => {
    const response = await adminOverviewQuery.refetch();

    if ("data" in response && response.data) {
      return response.data.data;
    }

    throw new Error(getQueryErrorMessage(response.error, "Unable to load admin overview.") ?? "Unable to load admin overview.");
  }, [adminOverviewQuery]);

  return {
    data: adminOverviewQuery.data?.data ?? null,
    error: getQueryErrorMessage(adminOverviewQuery.error, "Unable to load admin overview."),
    isLoading: adminOverviewQuery.isLoading || adminOverviewQuery.isFetching,
    refetch
  };
}

export function useAdminUsers(params: AdminUsersParams) {
  const [state, setState] = useState<QueryState<ApiSuccessResponse<AdminUsersResponse>>>({
    data: null,
    error: null,
    isLoading: true
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    setState((current) => ({ ...current, error: null, isLoading: true }));

    adminService
      .listUsers(params)
      .then((response) => {
        if (!active) {
          return;
        }

        setState({ data: response, error: null, isLoading: false });
      })
      .catch((caughtError) => {
        if (!active) {
          return;
        }

        const message = caughtError instanceof Error ? caughtError.message : "Unable to load users.";
        setState({ data: null, error: message, isLoading: false });
      });

    return () => {
      active = false;
    };
  }, [params.limit, params.page, params.search, refreshTrigger]);

  return {
    ...state,
    refetch
  };
}

export function useAdminReferrals(params: AdminReferralsParams) {
  const [state, setState] = useState<QueryState<ApiSuccessResponse<AdminReferralNetwork>>>({
    data: null,
    error: null,
    isLoading: true
  });

  useEffect(() => {
    let active = true;

    setState((current) => ({ ...current, error: null, isLoading: true }));

    adminService
      .listReferrals(params)
      .then((response) => {
        if (!active) {
          return;
        }

        setState({ data: response, error: null, isLoading: false });
      })
      .catch((caughtError) => {
        if (!active) {
          return;
        }

        const message = caughtError instanceof Error ? caughtError.message : "Unable to load referral network.";
        setState({ data: null, error: message, isLoading: false });
      });

    return () => {
      active = false;
    };
  }, [params.limit, params.level, params.page, params.parentUserId, params.rootOnly, params.search, params.status]);

  return state;
}

export function useAdminDeposits(params: AdminDepositsParams) {
  const depositsQuery = useAdminDepositsRtkQuery(params);

  const refetch = useCallback(async () => {
    const response = await depositsQuery.refetch();

    if ("data" in response && response.data) {
      return response.data;
    }

    throw new Error(getQueryErrorMessage(response.error, "Unable to load deposits.") ?? "Unable to load deposits.");
  }, [depositsQuery]);

  return {
    data: depositsQuery.data ?? null,
    error: getQueryErrorMessage(depositsQuery.error, "Unable to load deposits."),
    isLoading: depositsQuery.isLoading || depositsQuery.isFetching,
    refetch
  };
}

export function useAdminPayouts(params: AdminPayoutsParams) {
  const payoutsQuery = useAdminPayoutsRtkQuery(params);

  const refetch = useCallback(async () => {
    const response = await payoutsQuery.refetch();

    if ("data" in response && response.data) {
      return response.data;
    }

    throw new Error(getQueryErrorMessage(response.error, "Unable to load payouts.") ?? "Unable to load payouts.");
  }, [payoutsQuery]);

  return {
    data: payoutsQuery.data ?? null,
    error: getQueryErrorMessage(payoutsQuery.error, "Unable to load payouts."),
    isLoading: payoutsQuery.isLoading || payoutsQuery.isFetching,
    refetch
  };
}

export function useAdminWallets(params: AdminWalletsParams) {
  const [state, setState] = useState<QueryState<ApiSuccessResponse<AdminWalletsResponse>>>({
    data: null,
    error: null,
    isLoading: true
  });

  const refetch = useCallback(async () => {
    setState((current) => ({ ...current, error: null, isLoading: true }));

    try {
      const response = await adminService.listWallets(params);
      setState({ data: response, error: null, isLoading: false });
      return response;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load wallets.";
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

export function useAdminWithdrawals(params: AdminWithdrawalsParams) {
  const [state, setState] = useState<QueryState<ApiSuccessResponse<AdminWithdrawalsResponse>>>({
    data: null,
    error: null,
    isLoading: true
  });

  const refetch = useCallback(async () => {
    setState((current) => ({ ...current, error: null, isLoading: true }));

    try {
      const response = await adminService.listWithdrawals(params);
      setState({ data: response, error: null, isLoading: false });
      return response;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load withdrawal requests.";
      setState({ data: null, error: message, isLoading: false });
      throw caughtError;
    }
  }, [params.limit, params.page, params.search, params.status, params.fromDate, params.toDate]);

  useEffect(() => {
    void refetch().catch(() => undefined);
  }, [refetch]);

  return {
    ...state,
    refetch
  };
}

export function useAdminTransactions(params: AdminTransactionsParams) {
  const [state, setState] = useState<QueryState<ApiSuccessResponse<AdminTransactionsResponse>>>({
    data: null,
    error: null,
    isLoading: true
  });

  const refetch = useCallback(async () => {
    setState((current) => ({ ...current, error: null, isLoading: true }));

    try {
      const response = await adminService.listTransactions(params);
      setState({ data: response, error: null, isLoading: false });
      return response;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load transactions.";
      setState({ data: null, error: message, isLoading: false });
      throw caughtError;
    }
  }, [
    params.limit,
    params.page,
    params.search,
    params.status,
    params.type,
    params.fromDate,
    params.toDate
  ]);

  useEffect(() => {
    void refetch().catch(() => undefined);
  }, [refetch]);

  return {
    ...state,
    refetch
  };
}
