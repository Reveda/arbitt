import { adminService } from "./admin.service";
import { logger } from "../../../config/logger";

export class PayoutSchedulerService {
  async init() {
    logger.info("Initializing Payout Daily Scheduler...");
    try {
      const cron = await import("node-cron");

      // 1. Daily Level & Royalty Payouts (Every day at 23:50 Malaysia Time)
      cron.default.schedule(
        "50 23 * * *",
        async () => {
          logger.info("Running automated daily payout generation...");

          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, "0");
          const day = String(today.getDate()).padStart(2, "0");
          const dateString = `${year}-${month}-${day}`;

          // Daily Level Income
          try {
            logger.info(`Auto-generating daily level payouts for date: ${dateString}`);
            const result = await adminService.generateWeeklyPayouts({
              weekStart: dateString,
              payoutType: "level",
            });
            logger.info(
              `Auto-generated daily level payouts completed. Created: ${result.levelCreatedCount}`,
            );
          } catch (err) {
            logger.error(
              `Error auto-generating daily level payouts: ${err instanceof Error ? err.message : String(err)}`,
            );
          }

          // Daily Royalty
          try {
            logger.info(`Auto-generating daily royalty payouts for date: ${dateString}`);
            const result = await adminService.generateWeeklyPayouts({
              weekStart: dateString,
              payoutType: "royalty",
            });
            logger.info(
              `Auto-generated daily royalty payouts completed. Created: ${result.salaryRoyaltyCreatedCount}`,
            );
          } catch (err) {
            logger.error(
              `Error auto-generating daily royalty payouts: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        },
        {
          timezone: "Asia/Kuala_Lumpur",
        },
      );

      // 2. Weekly ROI Payouts (Every Friday at 21:00 / 9:00 PM Malaysia Time)
      cron.default.schedule(
        "0 21 * * 5",
        async () => {
          logger.info("Running automated weekly ROI payout generation...");

          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, "0");
          const day = String(today.getDate()).padStart(2, "0");
          const dateString = `${year}-${month}-${day}`;

          try {
            logger.info(`Auto-generating weekly ROI payouts for date: ${dateString}`);
            const result = await adminService.generateWeeklyPayouts({
              weekStart: dateString,
              payoutType: "roi",
            });
            logger.info(
              `Auto-generated weekly ROI payouts completed. Created: ${result.weeklyCreatedCount}`,
            );
          } catch (err) {
            logger.error(
              `Error auto-generating weekly ROI payouts: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        },
        {
          timezone: "Asia/Kuala_Lumpur",
        },
      );
    } catch (importErr) {
      logger.error(
        `Failed to load node-cron module dynamically: ${importErr instanceof Error ? importErr.message : String(importErr)}`,
      );
    }
  }
}

export const payoutSchedulerService = new PayoutSchedulerService();
