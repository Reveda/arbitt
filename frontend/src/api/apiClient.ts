import { ApiClientError, type ApiResponse } from "./types";
import { API_ENDPOINTS, AUTH_REFRESH_EXCLUDED_ENDPOINTS } from "./endpoints";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1").replace(/\/$/, "");

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuthRefresh?: boolean;
};

type ParsedResponse<T> = {
  payload: ApiResponse<T> | null;
  response: Response;
};

let authRefreshRequest: Promise<void> | null = null;

function buildUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildHeaders(options: ApiRequestOptions) {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function sendRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<ParsedResponse<T>> {
  const url = buildUrl(path);

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: buildHeaders(options),
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new ApiClientError("Unable to connect to API. Please check backend server and CORS configuration.");
  }

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  return { payload, response };
}

function shouldRefreshAuth(path: string, options: ApiRequestOptions, response: Response) {
  if (options.skipAuthRefresh || response.status !== 401) {
    return false;
  }

  return !AUTH_REFRESH_EXCLUDED_ENDPOINTS.some((authPath) =>
    path.startsWith(authPath)
  );
}

async function refreshAuthSession() {
  if (!authRefreshRequest) {
    authRefreshRequest = sendRequest(API_ENDPOINTS.auth.refreshToken, {
      method: "POST",
      skipAuthRefresh: true
    })
      .then(({ payload, response }) => {
        if (!response.ok || !payload?.success) {
          throw new ApiClientError(
            payload?.message ?? "Unable to refresh session.",
            payload?.statusCode ?? response.status
          );
        }
      })
      .finally(() => {
        authRefreshRequest = null;
      });
  }

  return authRefreshRequest;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  let { payload, response } = await sendRequest<T>(path, options);

  if (shouldRefreshAuth(path, options, response)) {
    try {
      await refreshAuthSession();

      const retry = await sendRequest<T>(path, {
        ...options,
        skipAuthRefresh: true
      });

      payload = retry.payload;
      response = retry.response;
    } catch {
      // The original 401 response below gives the page the safest message.
    }
  }

  if (!response.ok || !payload?.success) {
    throw new ApiClientError(payload?.message ?? "API request failed.", payload?.statusCode ?? response.status);
  }

  return payload;
}
