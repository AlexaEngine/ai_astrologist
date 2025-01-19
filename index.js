const TelegramBot = require("node-telegram-bot-api");
const { handleCommands, handleMessage } = require("./commands");
require("dotenv").config();

// Global bot variable to prevent multiple instances
let bot;

function initializeWebhook(db) {
  return async function handler(event) {
    try {
      // Initialize bot only if not already initialized
      if (!bot) {
        bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { webHook: true });
        const webhookUrl = process.env.WEBHOOK_URL; // Get webhook URL from environment
        await bot.setWebHook(webhookUrl);
        console.log(`✅ Webhook set to: ${webhookUrl}`);
        handleCommands(bot, db); // Attach commands only once
      }

      // Parse incoming Telegram webhook data
      const body = event.body ? JSON.parse(event.body) : {};
      
      if (body.message) {
        const msg = body.message;
        await handleMessage(bot, msg, db); // Handle incoming messages
      } else if (body.callback_query) {
        const query = body.callback_query;
        await bot.answerCallbackQuery(query.id); // Acknowledge callback query
        bot.emit("callback_query", query); // Emit callback query for custom handling
      }

      // Return success response
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Update processed successfully" }),
      };
    } catch (error) {
      console.error("❌ Error processing update:", error.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
      };
    }
  };
}

module.exports = { initializeWebhook };
