import type { Bot } from "grammy";
import { isCycleOpen } from "@photog-bot/shared";
import { supabase } from "../lib/supabase.js";

// Guards against double-sends if the cron fires more than once inside a
// week (e.g. after a redeploy) — reminder_log is the source of truth,
// this is just a minimum spacing check.
const REMINDER_COOLDOWN_DAYS = 6;

/**
 * Runs weekly while a cycle is open: DMs anyone missing a response for
 * any service date in that cycle. `reminder_log` prevents duplicate
 * sends within the cooldown window.
 */
export async function runWeeklyReminderJob(bot: Bot): Promise<void> {
  const { data: cycles, error } = await supabase.from("availability_cycles").select("*");
  if (error) throw error;

  const now = new Date();

  for (const cycle of cycles ?? []) {
    if (!isCycleOpen(cycle.deadline_at, now)) continue;

    const { data: serviceDates, error: serviceDatesError } = await supabase
      .from("service_dates")
      .select("*")
      .eq("cycle_id", cycle.id);
    if (serviceDatesError) throw serviceDatesError;
    if (!serviceDates?.length) continue;

    const { data: crew, error: crewError } = await supabase
      .from("people")
      .select("*")
      .eq("department_id", cycle.department_id)
      .eq("is_active", true)
      .not("telegram_id", "is", null);
    if (crewError) throw crewError;

    for (const person of crew ?? []) {
      if (!person.telegram_id) continue;

      const { data: responses, error: responsesError } = await supabase
        .from("availability_responses")
        .select("service_date_id")
        .eq("cycle_id", cycle.id)
        .eq("person_id", person.id);
      if (responsesError) throw responsesError;

      const respondedIds = new Set((responses ?? []).map((r) => r.service_date_id));
      const fullySubmitted = serviceDates.every((sd) => respondedIds.has(sd.id));
      if (fullySubmitted) continue;

      const { data: recentReminder, error: reminderError } = await supabase
        .from("reminder_log")
        .select("sent_at")
        .eq("cycle_id", cycle.id)
        .eq("person_id", person.id)
        .eq("reminder_type", "weekly_nudge")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (reminderError) throw reminderError;

      if (recentReminder) {
        const daysSinceLastReminder = (now.getTime() - new Date(recentReminder.sent_at).getTime()) / 86_400_000;
        if (daysSinceLastReminder < REMINDER_COOLDOWN_DAYS) continue;
      }

      try {
        await bot.api.sendMessage(
          person.telegram_id,
          "Reminder: you haven't finished submitting availability yet. " +
            `Send /availability to update it — deadline is ${new Date(cycle.deadline_at).toDateString()}.`,
        );
        await supabase.from("reminder_log").insert({
          cycle_id: cycle.id,
          person_id: person.id,
          reminder_type: "weekly_nudge",
        });
      } catch (err) {
        console.error(`Failed to send weekly nudge to person ${person.id}`, err);
      }
    }
  }
}
