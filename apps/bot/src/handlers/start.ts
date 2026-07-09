import type { Bot } from "grammy";
import { matchTelegramUser } from "../lib/matching.js";

export function registerStartHandler(bot: Bot) {
  bot.command("start", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const inviteCode = ctx.match?.toString().trim() || undefined;
    const handle = ctx.from?.username;

    const person = await matchTelegramUser({ telegramId, handle, inviteCode });

    if (!person) {
      await ctx.reply(
        "I couldn't match you to a crew record. Ask an IC to add you to the crew list, " +
          "or send you your personal invite link if your Telegram username doesn't match what they have on file.",
      );
      return;
    }

    if (!person.is_active) {
      await ctx.reply("Your account is marked inactive — ask an IC if this looks wrong.");
      return;
    }

    await ctx.reply(
      `Welcome, ${person.full_name}! You're all set.\n\n` +
        "Send /availability any time to view or update your availability for the current cycle.",
    );
  });
}
