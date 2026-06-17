import { createServer } from "node:http";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectRedis, disconnectRedis } from "./config/redis";
import { createApp } from "./app";
import { roleService } from "./modules/roles/services/role.service";
import { payoutSchedulerService } from "./modules/admin/services/payout-scheduler.service";

async function bootstrap() {
  await connectDatabase();
  await connectRedis();
  await roleService.seedDefaultRoles();
  payoutSchedulerService.init();

  const app = createApp();
  const server = createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`API server listening on port ${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down API server");
    server.close(async () => {
      await disconnectRedis();
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

bootstrap().catch((error) => {
  logger.fatal({ error }, "Failed to start backend server");
  process.exit(1);
});
