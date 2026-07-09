import type { Bot } from "grammy";
import { firstOfNextMonth } from "@photog-bot/shared";
import { ensureCycleForMonth, getServiceDates } from "../lib/cycle.js";
import { supabase } from "../lib/supabase.js";

function monthLabel(cycleMonth: string): string {
  const [year, month] = cycleMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Runs on the 1st of the month: opens next month's cycle for every
 * department (idempotent — safe to re-run) and DMs all active, matched
 * crew a link to submit availability.
 */
export async function runCycleOpenJob(bot: Bot): Promise<void> {
  const { data: departments, error } = await supabase.from("departments").select("*");
  if (error) throw error;

  for (const department of departments ?? []) {
    const cycleMonth = firstOfNextMonth();
    const cycle = await ensureCycleForMonth(department.id, cycleMonth);
    const serviceDates = await getServiceDates(cycle.id);
    if (!serviceDates.length) continue;

    const { data: crew, error: crewError } = await supabase
      .from("people")
      .select("*")
      .eq("department_id", department.id)
      .eq("is_active", true)
      .not("telegram_id", "is", null);
    if (crewError) throw crewError;

    for (const person of crew ?? []) {
      if (!person.telegram_id) continue;
      try {
        await bot.api.sendMessage(
          person.telegram_id,
          `Availability is open for ${monthLabel(cycle.cycle_month)}! Send /availability to submit — ` +
            `deadline is ${new Date(cycle.deadline_at).toDateString()}.`,
        );
        await supabase.from("reminder_log").insert({
          cycle_id: cycle.id,
          person_id: person.id,
          reminder_type: "opening",
        });
      } catch (err) {
        console.error(`Failed to send opening notice to person ${person.id}`, err);
      }
    }
  }
}
