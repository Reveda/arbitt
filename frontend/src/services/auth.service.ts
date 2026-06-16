import { apiRequest } from "@/api/apiClient";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiSuccessResponse } from "@/api/types";

export type AuthUser = {
  id: string;
  email: string;
  username: string | null;
  role: "user" | "admin" | "super_admin";
  status: "pending" | "active" | "suspended";
  referralCode: string | null;
  invitedBy: string | null;
  walletAddress: string | null;
  hasTransactionPassword: boolean;
  transactionPasswordUpdatedAt: string | null;
  emailVerified: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  rank: string | null;
};

export type AuthPayload = {
  user: AuthUser;
  auth: {
    tokenType: "Bearer";
    accessTokenCookie: boolean;
    refreshTokenCookie: boolean;
    rotated?: boolean;
  };
  emailVerification?: OtpDelivery & {
    required: boolean;
  };
};

export type RegisterPayload = {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  invitationCode: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type OtpDelivery = {
  accepted?: boolean;
  expiresAt?: string | null;
  testMode?: boolean;
  testOtp?: string;
};

export type EmailVerificationPayload = {
  email: string;
};

export type VerifyEmailPayload = {
  email: string;
  otp: string;
};

export type VerifyEmailResult = {
  verified: boolean;
  user: AuthUser;
};

export type ResetPasswordPayload = {
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
};

export type ResetPasswordResult = {
  reset: boolean;
};

export type UpdateWalletAddressPayload = {
  walletAddress: string;
};

export type UpdateTransactionPasswordPayload = {
  currentTransactionPassword?: string;
  transactionPassword: string;
  confirmTransactionPassword: string;
};

const CURRENT_USER_CACHE_TTL_MS = 30_000;

let currentUserCache: { user: AuthUser; cachedAt: number } | null = null;
let currentUserRequest: Promise<ApiSuccessResponse<{ user: AuthUser }>> | null =
  null;

function setCurrentUserCache(user: AuthUser) {
  currentUserCache = {
    cachedAt: Date.now(),
    user,
  };
}

function clearCurrentUserCache() {
  currentUserCache = null;
  currentUserRequest = null;
}

function getCachedCurrentUserResponse() {
  if (!currentUserCache) {
    return null;
  }

  const isFresh =
    Date.now() - currentUserCache.cachedAt < CURRENT_USER_CACHE_TTL_MS;

  if (!isFresh) {
    return null;
  }

  return {
    statusCode: 200,
    success: true,
    message: "Current user loaded.",
    data: {
      user: currentUserCache.user,
    },
  } satisfies ApiSuccessResponse<{ user: AuthUser }>;
}

function cacheAuthResponse(response: ApiSuccessResponse<AuthPayload>) {
  setCurrentUserCache(response.data.user);
  return response;
}

export const authService = {
  register(payload: RegisterPayload) {
    return apiRequest<AuthPayload>(API_ENDPOINTS.auth.register, {
      method: "POST",
      body: payload,
    }).then(cacheAuthResponse);
  },

  login(payload: LoginPayload) {
    return apiRequest<AuthPayload>(API_ENDPOINTS.auth.login, {
      method: "POST",
      body: payload,
    }).then(cacheAuthResponse);
  },

  forgotPassword(payload: ForgotPasswordPayload) {
    return apiRequest<OtpDelivery & { accepted: boolean }>(
      API_ENDPOINTS.auth.forgotPassword,
      {
        method: "POST",
        body: payload,
      },
    );
  },

  requestEmailVerificationOtp(payload: EmailVerificationPayload) {
    return apiRequest<OtpDelivery & { accepted: boolean }>(
      API_ENDPOINTS.auth.requestEmailVerification,
      {
        method: "POST",
        body: payload,
      },
    );
  },

  verifyEmail(payload: VerifyEmailPayload) {
    return apiRequest<VerifyEmailResult>(API_ENDPOINTS.auth.verifyEmail, {
      method: "POST",
      body: payload,
    }).then((response) => {
      setCurrentUserCache(response.data.user);
      return response;
    });
  },

  resetPassword(payload: ResetPasswordPayload) {
    return apiRequest<ResetPasswordResult>(API_ENDPOINTS.auth.resetPassword, {
      method: "POST",
      body: payload,
    }).then((response) => {
      clearCurrentUserCache();
      return response;
    });
  },

  refreshToken() {
    return apiRequest<AuthPayload>(API_ENDPOINTS.auth.refreshToken, {
      method: "POST",
      skipAuthRefresh: true,
    }).then(cacheAuthResponse);
  },

  logout() {
    return apiRequest<{ loggedOut: boolean }>(API_ENDPOINTS.auth.logout, {
      method: "POST",
    }).then((response) => {
      clearCurrentUserCache();
      return response;
    });
  },

  getCurrentUser(options?: { force?: boolean }) {
    if (!options?.force) {
      const cachedResponse = getCachedCurrentUserResponse();

      if (cachedResponse) {
        return Promise.resolve(cachedResponse);
      }

      if (currentUserRequest) {
        return currentUserRequest;
      }
    }

    currentUserRequest = apiRequest<{ user: AuthUser }>(API_ENDPOINTS.users.me)
      .then((response) => {
        setCurrentUserCache(response.data.user);
        return response;
      })
      .finally(() => {
        currentUserRequest = null;
      });

    return currentUserRequest;
  },

  updateWalletAddress(payload: UpdateWalletAddressPayload) {
    return apiRequest<{ user: AuthUser }>(API_ENDPOINTS.users.walletAddress, {
      method: "PATCH",
      body: payload,
    }).then((response) => {
      setCurrentUserCache(response.data.user);
      return response;
    });
  },

  updateTransactionPassword(payload: UpdateTransactionPasswordPayload) {
    return apiRequest<{ user: AuthUser }>(
      API_ENDPOINTS.users.transactionPassword,
      {
        method: "PATCH",
        body: payload,
      },
    ).then((response) => {
      setCurrentUserCache(response.data.user);
      return response;
    });
  },
};
