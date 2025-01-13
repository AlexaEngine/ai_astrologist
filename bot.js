const { MongoClient } = require("mongodb");
const TelegramBot = require("node-telegram-bot-api");
const dotenv = require("dotenv");
const { handleCommands, handleMessage } = require("./commands");
const { initializeWebhook } = require("./webhook"); // Fixed the import

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
    // Updated to use the correct function name
    initializeWebhook(db); // Pass `db` to the webhook initialization
  } else {
    handleCommands(bot, db);
    bot.on("message", (msg) => handleMessage(bot, msg, db));
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
