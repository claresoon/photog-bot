import cron from "node-cron";
import type { Bot } from "grammy";
import { runCycleOpenJob } from "./cycle-open.js";
import { runWeeklyReminderJob } from "./weekly-reminder.js";

/** In-process cron, per SPEC.md §11 (Railway Cron Jobs are an alternative — this needs no extra infra). */
export function startScheduler(bot: Bot): void {
  // 1st of every month, 09:00 server time.
  cron.schedule("0 9 1 * *", () => {
    runCycleOpenJob(bot).catch((err) => console.error("cycle-open job failed", err));
  });

  // Every Monday, 09:00 server time, while a cycle is open.
  cron.schedule("0 9 * * 1", () => {
    runWeeklyReminderJob(bot).catch((err) => console.error("weekly-reminder job failed", err));
  });
}
