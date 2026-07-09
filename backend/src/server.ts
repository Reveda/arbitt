import { createServer } from "node:http";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectRedis, disconnectRedis } from "./config/redis";
import { createApp } from "./app";
import { roleService } from "./modules/roles/services/role.service";
import { payoutSchedulerService } from "./modules/admin/services/payout-scheduler.service";
import { createWithdrawalWorker } from "./modules/wallet/workers/withdrawal.worker";
import { createEmailWorker } from "./modules/email/workers/email.worker";

async function bootstrap() {
  await connectDatabase();
  await connectRedis();
  await roleService.seedDefaultRoles();

  const shouldRunApi = env.PROCESS_ROLE === "api" || env.PROCESS_ROLE === "all";
  const shouldRunWorkers = env.PROCESS_ROLE === "worker" || env.PROCESS_ROLE === "all";
  const withdrawalWorker = shouldRunWorkers ? createWithdrawalWorker() : null;
  const emailWorker = shouldRunWorkers ? createEmailWorker() : null;
  let server: ReturnType<typeof createServer> | null = null;

  if (shouldRunWorkers) {
    void payoutSchedulerService.init();
    logger.info("Background worker services started");
  }

  if (shouldRunApi) {
    const app = createApp();
    server = createServer(app);

    server.listen(env.PORT, () => {
      logger.info(`API server listening on port ${env.PORT}`);
    });
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down API server");

    const closeResources = async () => {
      if (withdrawalWorker) {
        await withdrawalWorker.close();
      }
      if (emailWorker) {
        await emailWorker.close();
      }
      await disconnectRedis();
      await disconnectDatabase();
      process.exit(0);
    };

    if (!server) {
      await closeResources();
      return;
    }

    server.close(() => {
      void closeResources();
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

bootstrap().catch((error) => {
  logger.fatal({ error }, "Failed to start backend server");
  process.exit(1);
});
