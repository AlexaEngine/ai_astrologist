const { MongoClient } = require("mongodb");
const TelegramBot = require("node-telegram-bot-api");
const dotenv = require("dotenv");
const { handleCommands, handleMessage } = require("./commands");
const { initializeWebhook } = require("./index"); // Correctly import the webhook handler

dotenv.config();

// MongoDB Configuration
const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);
let db;

// MongoDB Connection
async function connectToMongoDB() {
  try {
    await client.connect();
    db = client.db("astrologyBotDB");
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    setTimeout(connectToMongoDB, 5000); // Retry connection
  }
}

// Initialize Telegram Bot
async function startBot() {
  const botMode = process.env.BOT_MODE || "polling"; // Options: "polling", "webhook"
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: botMode === "polling",
  });

  console.log(`🤖 Bot is running in ${botMode} mode...`);

  if (botMode === "webhook") {
    const webhookUrl = process.env.WEBHOOK_URL;
    bot.setWebHook(webhookUrl)
      .then(() => console.log(`✅ Webhook set to ${webhookUrl}`))
      .catch((err) => console.error("❌ Failed to set webhook:", err.message));

    const webhookHandler = initializeWebhook(db); // Get the webhook handler
    return webhookHandler; // Return handler for external invocation
  } else {
    handleCommands(bot, db); // Register bot commands
    bot.on("message", (msg) => handleMessage(bot, msg, db)); // Handle incoming messages
  }
}

// Initialize MongoDB and Start Bot
(async () => {
  try {
    await connectToMongoDB();
    console.log("🗄️ MongoDB is ready. Starting bot...");
    startBot();
  } catch (error) {
    console.error("❌ Failed to initialize bot:", error.message);
    process.exit(1);
  }
})();
