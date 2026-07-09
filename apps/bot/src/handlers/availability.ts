import { InlineKeyboard, type Bot } from "grammy";
import { formatDateHuman, isCycleOpen } from "@photog-bot/shared";
import type { ServiceDate } from "@photog-bot/shared";
import { getPersonByTelegramId } from "../lib/matching.js";
import { getOpenCycle, getServiceDates } from "../lib/cycle.js";
import { supabase } from "../lib/supabase.js";

const CALLBACK_PREFIX = "av:";
const DONE_PAYLOAD = "done";

async function getResponseMap(cycleId: string, personId: string): Promise<Map<string, boolean>> {
  const { data, error } = await supabase
    .from("availability_responses")
    .select("service_date_id, is_available")
    .eq("cycle_id", cycleId)
    .eq("person_id", personId);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.service_date_id, row.is_available]));
}

function buildKeyboard(serviceDates: ServiceDate[], responses: Map<string, boolean>): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const serviceDate of serviceDates) {
    const status = responses.get(serviceDate.id);
    const icon = status === true ? "✅" : status === false ? "❌" : "❔";
    keyboard.text(`${icon} ${formatDateHuman(serviceDate.service_date)}`, `${CALLBACK_PREFIX}${serviceDate.id}`).row();
  }
  keyboard.text("Done", `${CALLBACK_PREFIX}${DONE_PAYLOAD}`);
  return keyboard;
}

function formatCycleMonth(cycleMonth: string): string {
  const [year, month] = cycleMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function registerAvailabilityHandlers(bot: Bot) {
  bot.command("availability", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const person = await getPersonByTelegramId(telegramId);
    if (!person) {
      await ctx.reply("I don't have you matched yet — send /start first.");
      return;
    }

    const cycle = await getOpenCycle(person.department_id);
    if (!cycle) {
      await ctx.reply("There's no open availability window right now. Check back after the 1st of the month.");
      return;
    }

    const serviceDates = await getServiceDates(cycle.id);
    if (!serviceDates.length) {
      await ctx.reply("This cycle has no service dates configured yet — ask an IC.");
      return;
    }

    const responses = await getResponseMap(cycle.id, person.id);
    await ctx.reply(
      `Availability for ${formatCycleMonth(cycle.cycle_month)} — tap a date to toggle available/unavailable.\n` +
        `Deadline: ${new Date(cycle.deadline_at).toDateString()}.`,
      { reply_markup: buildKeyboard(serviceDates, responses) },
    );
  });

  bot.callbackQuery(/^av:/, async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const person = await getPersonByTelegramId(telegramId);
    if (!person) {
      await ctx.answerCallbackQuery({ text: "Send /start first.", show_alert: true });
      return;
    }

    const cycle = await getOpenCycle(person.department_id);
    if (!cycle) {
      await ctx.answerCallbackQuery({ text: "This cycle is closed.", show_alert: true });
      return;
    }

    const payload = ctx.callbackQuery.data.slice(CALLBACK_PREFIX.length);
    const serviceDates = await getServiceDates(cycle.id);

    if (payload === DONE_PAYLOAD) {
      const responses = await getResponseMap(cycle.id, person.id);
      const missing = serviceDates.filter((sd) => !responses.has(sd.id));
      if (missing.length) {
        await ctx.answerCallbackQuery({
          text: `Still missing ${missing.length} date(s) — tap them to fill in, then Done again.`,
          show_alert: true,
        });
        return;
      }

      const summary = serviceDates
        .map((sd) => `${responses.get(sd.id) ? "✅" : "❌"} ${formatDateHuman(sd.service_date)}`)
        .join("\n");
      await ctx.editMessageText(
        `Availability saved for ${formatCycleMonth(cycle.cycle_month)}:\n\n${summary}\n\n` +
          "You can send /availability any time before the deadline to change it.",
      );
      await ctx.answerCallbackQuery({ text: "Saved!" });
      return;
    }

    if (!isCycleOpen(cycle.deadline_at)) {
      await ctx.answerCallbackQuery({ text: "The deadline has passed.", show_alert: true });
      return;
    }

    const serviceDateId = payload;
    if (!serviceDates.some((sd) => sd.id === serviceDateId)) {
      await ctx.answerCallbackQuery({ text: "That date isn't part of this cycle anymore.", show_alert: true });
      return;
    }

    const responses = await getResponseMap(cycle.id, person.id);
    const nextIsAvailable = responses.get(serviceDateId) !== true;

    const { error } = await supabase.from("availability_responses").upsert(
      {
        cycle_id: cycle.id,
        person_id: person.id,
        service_date_id: serviceDateId,
        is_available: nextIsAvailable,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "person_id,service_date_id" },
    );
    if (error) throw error;

    const updatedResponses = await getResponseMap(cycle.id, person.id);
    await ctx.editMessageReplyMarkup({ reply_markup: buildKeyboard(serviceDates, updatedResponses) });
    await ctx.answerCallbackQuery();
  });
}
