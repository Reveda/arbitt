import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import helmet from "helmet";
import path from "node:path";
import { allowedOrigins, env } from "./config/env";
import { logger } from "./config/logger";
import { apiActivityTracker } from "./middlewares/apiActivityTracker";
import { errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFound";
import { requestLogger } from "./middlewares/requestLogger";
import { apiRoutes } from "./routes";
import type { ApiRootResponseDto } from "./dtos/api-root.dto";
import { apiResponse } from "./utils/ApiResponse";

function registerFrontendAssets(app: express.Express) {
  if (env.NODE_ENV !== "production") {
    return;
  }

  const frontendDistDir = process.env.FRONTEND_DIST_DIR
    ? path.resolve(process.env.FRONTEND_DIST_DIR)
    : path.resolve(__dirname, "../../frontend/dist");
  const indexFile = path.join(frontendDistDir, "index.html");

  if (!fs.existsSync(indexFile)) {
    logger.warn({ frontendDistDir }, "Frontend dist directory not found; serving API only.");
    return;
  }

  app.use(express.static(frontendDistDir));
  app.get("*", (req, res, next) => {
    if (req.path === env.API_PREFIX || req.path.startsWith(`${env.API_PREFIX}/`)) {
      next();
      return;
    }

    res.sendFile(indexFile);
  });
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(requestLogger);
  app.use(apiActivityTracker);

  const sendApiRoot = (_req: express.Request, res: express.Response) => {
    res.json(
      apiResponse<ApiRootResponseDto>(200, "ARBITRUM backend API is running.", {
        apiBase: env.API_PREFIX,
      }),
    );
  };

  app.get(env.API_PREFIX, sendApiRoot);
  if (env.NODE_ENV !== "production") {
    app.get("/", sendApiRoot);
  }
  app.use(env.API_PREFIX, apiRoutes);
  registerFrontendAssets(app);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
