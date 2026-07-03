import { adminService } from "./admin.service";
import { logger } from "../../../config/logger";

export class PayoutSchedulerService {
  async runStartupCheck() {
    logger.info("Running payout startup check...");

    const dateString = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
    });

    // 1. Check and generate daily level payouts
    try {
      logger.info(`Startup check: Auto-generating daily level payouts for date: ${dateString}`);
      const resultLevel = await adminService.generateWeeklyPayouts({
        weekStart: dateString,
        payoutType: "level",
      });
      logger.info(`Startup check: Daily level payouts completed. Created: ${resultLevel.levelCreatedCount}`);
    } catch (err) {
      logger.error(`Error in startup daily level check: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 2. Check and generate daily royalty payouts (Runs for yesterday to avoid premature generation on incomplete today)
    try {
      const yesterday = new Date(dateString);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDateString = yesterday.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kuala_Lumpur",
      });

      logger.info(`Startup check: Auto-generating daily royalty payouts for date: ${yesterdayDateString}`);
      const resultRoyalty = await adminService.generateWeeklyPayouts({
        weekStart: yesterdayDateString,
        payoutType: "royalty",
      });
      logger.info(`Startup check: Daily royalty payouts completed. Created: ${resultRoyalty.salaryRoyaltyCreatedCount}`);
    } catch (err) {
      logger.error(`Error in startup daily royalty check: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 3. Check and generate weekly ROI payouts (if Friday, Saturday, or Sunday)
    const day = new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kuala_Lumpur", weekday: "long" });
    const isFriday = day === "Friday";
    const isSaturday = day === "Saturday";
    const isSunday = day === "Sunday";

    if (isFriday || isSaturday || isSunday) {
      try {
        let targetFridayString = dateString;
        if (isSaturday) {
          const prevDay = new Date();
          prevDay.setDate(prevDay.getDate() - 1);
          targetFridayString = prevDay.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
        } else if (isSunday) {
          const prevDay = new Date();
          prevDay.setDate(prevDay.getDate() - 2);
          targetFridayString = prevDay.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
        }

        logger.info(`Startup check: Auto-generating weekly ROI payouts for target Friday: ${targetFridayString}`);
        const resultRoi = await adminService.generateWeeklyPayouts({
          weekStart: targetFridayString,
          payoutType: "roi",
        });
        logger.info(`Startup check: Weekly ROI payouts completed. Created: ${resultRoi.weeklyCreatedCount}`);
      } catch (err) {
        logger.error(`Error in startup weekly ROI check: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  async init() {
    logger.info("Initializing Payout Daily Scheduler...");

    // Run startup check asynchronously
    this.runStartupCheck().catch((err) => {
      logger.error(`Failed to execute startup check: ${err}`);
    });

    try {
      const cron = await import("node-cron");

      // 1. Daily Level & Royalty Payouts (Every day at 23:50 Malaysia Time)
      cron.default.schedule(
        "50 23 * * *",
        async () => {
          logger.info("Running automated daily payout generation...");

          const dateString = new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Kuala_Lumpur",
          });

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

          const dateString = new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Kuala_Lumpur",
          });

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
