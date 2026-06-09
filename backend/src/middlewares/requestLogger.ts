import morgan from "morgan";
import { env } from "../config/env";
import { logger } from "../config/logger";

export const requestLogger = morgan(env.NODE_ENV === "production" ? "combined" : "dev", {
  skip: (req) => req.url === "/api/v1/health",
  stream: {
    write: (message) => {
      logger.info(message.trim());
    },
  },
});
