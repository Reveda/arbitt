import type { env } from "../../../config/env";

export type HealthResponseDto = {
  service: "arbitrum-backend";
  environment: typeof env.NODE_ENV;
  uptimeSeconds: number;
  timestamp: string;
  cache: {
    redis: "disabled" | "ready" | "unavailable";
  };
};
