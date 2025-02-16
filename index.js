const TelegramBot = require("node-telegram-bot-api");
const { handleCommands, handleMessage } = require("./commands");
require("dotenv").config();

// Global bot variable to prevent multiple instances
let bot;

exports.handler = async (event) => {
  try {
    console.log("Lambda function invoked"); // Log function start
    console.log("Event received:", JSON.stringify(event)); // Log the incoming event
    console.log("Environment variables:", process.env); // Log environment variables

    // Initialize the bot only if it's not already initialized
    if (!bot) {
      console.log("Initializing Telegram bot...");
      bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { webHook: true });
      const webhookUrl = process.env.WEBHOOK_URL; // Get webhook URL from environment variables

      // Set the webhook for Telegram
      console.log(`Setting webhook to: ${webhookUrl}`);
      await bot.setWebHook(webhookUrl);
      console.log(`✅ Webhook successfully set to: ${webhookUrl}`);

      // Attach commands and listeners
      handleCommands(bot);
      console.log("Commands and listeners attached");
    }

    // Parse incoming Telegram webhook data
    const body = event.body ? JSON.parse(event.body) : {};
    console.log("Parsed event body:", body);

    // Handle Telegram message
    if (body.message) {
      console.log("Processing message:", body.message);
      await handleMessage(bot, body.message); // Process messages
    } else if (body.callback_query) {
      const query = body.callback_query;
      console.log("Processing callback query:", query);
      await bot.answerCallbackQuery(query.id); // Acknowledge the callback query
      bot.emit("callback_query", query); // Emit callback query for custom handling
    }

    // Return a success response
    console.log("Function execution successful");
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Update processed successfully" }),
    };
  } catch (error) {
    console.error("❌ Error occurred while processing update:", error); // Log full error
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
