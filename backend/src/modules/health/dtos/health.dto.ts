export type HealthResponseDto = {
  service: "arbitrum-backend";
  timestamp: string;
  cache: {
    redis: "disabled" | "ready" | "unavailable";
  };
};
