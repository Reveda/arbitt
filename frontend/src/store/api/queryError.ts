import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

export type ApiQueryError = FetchBaseQueryError | SerializedError | { message?: string } | undefined;

export function getQueryErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (!error) {
    return null;
  }

  const queryError = error as ApiQueryError;

  if (queryError && "message" in queryError && typeof queryError.message === "string") {
    return queryError.message;
  }

  if (
    queryError &&
    "data" in queryError &&
    queryError.data &&
    typeof queryError.data === "object" &&
    "message" in queryError.data
  ) {
    const message = queryError.data.message;
    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
}
