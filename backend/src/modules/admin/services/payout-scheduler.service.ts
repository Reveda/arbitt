import { adminService } from "./admin.service";
import { logger } from "../../../config/logger";

export class PayoutSchedulerService {
  async init() {
    logger.info("Initializing Payout Daily Scheduler...");
    try {
      const cron = await import("node-cron");

      // Run every day at 23:50 (11:50 PM)
      cron.default.schedule("50 23 * * *", async () => {
        logger.info("Running automated daily payout generation...");

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const dateString = `${year}-${month}-${day}`;

        // 1. Daily Level Income
        try {
          logger.info(`Auto-generating daily level payouts for date: ${dateString}`);
          const result = await adminService.generateWeeklyPayouts({
            weekStart: dateString,
            payoutType: "level",
          });
          logger.info(`Auto-generated daily level payouts completed. Created: ${result.levelCreatedCount}`);
        } catch (err) {
          logger.error(`Error auto-generating daily level payouts: ${err instanceof Error ? err.message : String(err)}`);
        }

        // 2. Daily Royalty
        try {
          logger.info(`Auto-generating daily royalty payouts for date: ${dateString}`);
          const result = await adminService.generateWeeklyPayouts({
            weekStart: dateString,
            payoutType: "royalty",
          });
          logger.info(`Auto-generated daily royalty payouts completed. Created: ${result.salaryRoyaltyCreatedCount}`);
        } catch (err) {
          logger.error(`Error auto-generating daily royalty payouts: ${err instanceof Error ? err.message : String(err)}`);
        }

        // 3. Weekly ROI (Fridays only)
        if (today.getUTCDay() === 5) { // 5 is Friday
          try {
            logger.info(`Auto-generating weekly ROI payouts for date: ${dateString}`);
            const result = await adminService.generateWeeklyPayouts({
              weekStart: dateString,
              payoutType: "roi",
            });
            logger.info(`Auto-generated weekly ROI payouts completed. Created: ${result.weeklyCreatedCount}`);
          } catch (err) {
            logger.error(`Error auto-generating weekly ROI payouts: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      });
    } catch (importErr) {
      logger.error(`Failed to load node-cron module dynamically: ${importErr instanceof Error ? importErr.message : String(importErr)}`);
    }
  }
}

export const payoutSchedulerService = new PayoutSchedulerService();
