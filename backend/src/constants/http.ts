import { StatusCodes } from "http-status-codes";

export const HTTP_STATUS = StatusCodes;

export const RESPONSE_MESSAGES = {
  AUTH: {
    REGISTERED: "Registration request accepted.",
    LOGGED_IN: "Login successful.",
    PASSWORD_RESET_ACCEPTED: "Password recovery request accepted.",
    TOKEN_REFRESHED: "Token refreshed.",
  },
  COMMON: {
    NOT_FOUND: "Resource not found.",
    UNAUTHORIZED: "Authentication is required.",
    FORBIDDEN: "You do not have permission to access this resource.",
  },
} as const;
