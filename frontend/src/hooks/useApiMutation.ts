import { useState } from "react";
import type { ApiSuccessResponse } from "@/api/types";

type MutationFn<TInput, TData> = (input: TInput) => Promise<ApiSuccessResponse<TData>>;

export function useApiMutation<TInput, TData>(mutationFn: MutationFn<TInput, TData>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiSuccessResponse<TData> | null>(null);

  const mutate = async (input: TInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mutationFn(input);
      setData(result);
      return result;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Something went wrong.";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setData(null);
  };

  return {
    data,
    error,
    isLoading,
    mutate,
    reset
  };
}
