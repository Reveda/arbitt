import type { ApiSuccessResponse } from "@/api/types";
import { getQueryErrorMessage } from "@/store/api/queryError";
import {
  useForgotPasswordMutation,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useRequestEmailVerificationMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
} from "@/store/api/authApi";

type MutationTrigger<TInput, TData> = (input: TInput) => {
  unwrap: () => Promise<ApiSuccessResponse<TData>>;
};

type MutationState<TData> = {
  data?: ApiSuccessResponse<TData>;
  error?: unknown;
  isLoading: boolean;
  reset: () => void;
};

function useRtkMutationAdapter<TInput, TData>(
  trigger: MutationTrigger<TInput, TData>,
  state: MutationState<TData>,
) {
  const mutate = (input: TInput) => trigger(input).unwrap();

  return {
    data: state.data ?? null,
    error: getQueryErrorMessage(state.error),
    isLoading: state.isLoading,
    mutate,
    reset: state.reset,
  };
}

export function useRegisterAccount() {
  const [trigger, state] = useRegisterMutation();
  return useRtkMutationAdapter(trigger, state);
}

export function useLoginAccount() {
  const [trigger, state] = useLoginMutation();
  return useRtkMutationAdapter(trigger, state);
}

export function useForgotPasswordRequest() {
  const [trigger, state] = useForgotPasswordMutation();
  return useRtkMutationAdapter(trigger, state);
}

export function useEmailVerificationRequest() {
  const [trigger, state] = useRequestEmailVerificationMutation();
  return useRtkMutationAdapter(trigger, state);
}

export function useVerifyEmail() {
  const [trigger, state] = useVerifyEmailMutation();
  return useRtkMutationAdapter(trigger, state);
}

export function useResetPassword() {
  const [trigger, state] = useResetPasswordMutation();
  return useRtkMutationAdapter(trigger, state);
}

export function useLogoutAccount() {
  const [trigger, state] = useLogoutMutation();
  return useRtkMutationAdapter(trigger, state);
}
