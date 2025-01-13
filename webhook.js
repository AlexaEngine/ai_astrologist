const express = require("express");
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");
const moment = require("moment-timezone");
const { handleCommands, handleMessage } = require("./commands");

require("dotenv").config();

function initializeWebhook(db) {
  const app = express();
  app.use(bodyParser.json());

  // Create Telegram Bot in webhook mode
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { webHook: true });

  // Set webhook URL
  const webhookUrl = `${process.env.WEBHOOK_URL}/telegram-webhook`;
  bot.setWebHook(webhookUrl);

  console.log(`✅ Webhook set to ${webhookUrl}`);

  // Handle webhook updates
  app.post("/telegram-webhook", (req, res) => {
    const update = req.body;

    // Process commands or messages
    if (update.message) {
      const msg = update.message;
      handleMessage(bot, msg, db);
    } else if (update.callback_query) {
      const query = update.callback_query;
      bot.answerCallbackQuery(query.id); // Acknowledge callback query
      bot.emit("callback_query", query);
    }

    res.status(200).send("OK");
  });

  // Attach bot commands
  handleCommands(bot, db);

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error("❌ Webhook Error:", err.message);
    res.status(500).send("Internal Server Error");
  });

  // Start server
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Webhook server is running on port ${port}`);
  });
}

module.exports = { initializeWebhook };


