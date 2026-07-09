import "dotenv/config";
import http from "node:http";
import { Bot, webhookCallback } from "grammy";
import { registerStartHandler } from "./handlers/start.js";
import { registerAvailabilityHandlers } from "./handlers/availability.js";
import { startScheduler } from "./jobs/scheduler.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required");

const bot = new Bot(token);

registerStartHandler(bot);
registerAvailabilityHandlers(bot);

bot.catch((err) => {
  console.error("Unhandled bot error", err);
});

startScheduler(bot);

const webhookUrl = process.env.BOT_WEBHOOK_URL;

if (webhookUrl) {
  const secretToken = process.env.BOT_WEBHOOK_SECRET;
  const handleUpdate = webhookCallback(bot, "http", { secretToken });

  const server = http.createServer((req, res) => {
    if (req.url === "/webhook" && req.method === "POST") {
      handleUpdate(req, res).catch((err) => {
        console.error("Webhook handler error", err);
        res.writeHead(500);
        res.end();
      });
      return;
    }
    if (req.url === "/health") {
      res.writeHead(200);
      res.end("ok");
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const port = Number(process.env.PORT ?? 3001);
  server.listen(port, async () => {
    await bot.api.setWebhook(webhookUrl, secretToken ? { secret_token: secretToken } : undefined);
    console.log(`Bot listening for webhooks on :${port}`);
  });
} else {
  bot.api.deleteWebhook().catch(() => {});
  void bot.start();
  console.log("Bot started with long polling");
}
