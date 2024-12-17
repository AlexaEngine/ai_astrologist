const OpenAI = require("openai");
const TelegramBot = require("node-telegram-bot-api");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);

let db;

// Use the PORT declaration only once
const PORT = process.env.PORT || 3000;
const URL = process.env.BOT_URL;

// Import Express
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// Initialize Telegram Bot with Webhook
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { webHook: true });
bot.setWebHook(`${URL}/bot${process.env.TELEGRAM_BOT_TOKEN}`);

console.log("✅ Webhook URL:", `${URL}/bot${process.env.TELEGRAM_BOT_TOKEN}`);

// MongoDB Connection
(async () => {
  try {
    await client.connect();
    db = client.db("astrologyBotDB");
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
})();

// Heroku Endpoint to Process Webhooks
app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Webhook Processing Error:", error.message);
    res.sendStatus(500);
  }
});

// Start the Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Save and Retrieve User Data
async function saveUserData(userId, data) {
  if (!db) return;
  try {
    const usersCollection = db.collection("users");
    await usersCollection.updateOne(
      { userId },
      { $set: { ...data } },
      { upsert: true }
    );
  } catch (error) {
    console.error("❌ Error saving user data:", error);
  }
}

async function getUserData(userId) {
  if (!db) return null;
  try {
    const usersCollection = db.collection("users");
    return await usersCollection.findOne({ userId });
  } catch (error) {
    console.error("❌ Error fetching user data:", error);
    return null;
  }
}

// OpenAI Response Generation
async function generateResponse(prompt, userData, language) {
  try {
    const systemPrompt =
      language === "RU"
        ? "Ты заботливый, понимающий и мудрый астролог и психолог с более чем 50-летним опытом. Твоя задача — поддерживать пользователей, помогать им находить внутреннюю силу, справляться с тревогой, депрессией и сложными жизненными ситуациями, такими как насилие или кризис. Ты говоришь искренне, с теплотой, предлагая не только астрологические прогнозы, но и эмоциональную поддержку, основанную на индивидуальных особенностях человека. Общайся так, чтобы каждый пользователь чувствовал, что ты рядом, что тебя волнуют их чувства и потребности."
        : "You are a caring, understanding, and wise astrologer and psychologist with over 50 years of experience. Your mission is to support users, help them find inner strength, cope with anxiety, depression, and difficult life situations such as abuse or crises. You speak sincerely and warmly, offering not only astrological insights but also emotional support tailored to each individual. Engage in a way that makes every user feel like you are there for them, genuinely concerned about their emotions and needs.";

    const context = userData
      ? `The user's name is ${userData.name}, born on ${userData.birthday}, in ${userData.birthplace}. ${
          userData.birthtime
            ? `Their birth time is ${userData.birthtime}.`
            : "The birth time is not provided."
        }`
      : "No user details provided.";

    const fullPrompt = `${context}\n\n${prompt}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullPrompt },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("❌ OpenAI Error:", error.message);
    return language === "RU"
      ? "Произошла ошибка при генерации ответа."
      : "An error occurred while generating the response.";
  }
}

// Start Command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Choose your language / Выберите язык:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "English", callback_data: "LANG_ENG" }],
        [{ text: "Русский", callback_data: "LANG_RU" }],
      ],
    },
  });
});

// Language Selection
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const language = query.data === "LANG_RU" ? "RU" : "ENG";

  await saveUserData(chatId, { language });

  const welcomeMessage =
    language === "RU"
      ? "Привет! Я ваш астрологический помощник и гид. Используйте /help, чтобы узнать доступные команды и начать наш диалог."
      : "Hi! I’m your astrology assistant and guide. Use /help to explore the available commands and start our conversation.";

  bot.sendMessage(chatId, welcomeMessage);
});

// Help Command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const userData = await getUserData(chatId);
  const language = userData?.language || "ENG";

  const helpText =
    language === "RU"
      ? `
Доступные команды:
- /today - Гороскоп на сегодня.
- /tomorrow - Гороскоп на завтра.
- /year - Годовой прогноз.
- /compatibility - Совместимость.
- /viewinfo - Посмотреть данные.
- /setinfo - Добавить/обновить данные.
`
      : `
Available commands:
- /today - Get today's horoscope.
- /tomorrow - Get tomorrow's horoscope.
- /year - Get your annual forecast.
- /compatibility - Check compatibility.
- /viewinfo - View saved information.
- /setinfo - Add or update personal info.
`;

  bot.sendMessage(chatId, helpText);
});

// Command Handlers
async function handleHoroscopeCommand(msg, promptTemplate) {
  const chatId = msg.chat.id;
  const userData = await getUserData(chatId);

  if (!userData?.birthday || !userData?.birthplace) {
    bot.sendMessage(
      chatId,
      userData?.language === "RU"
        ? "Сначала введите данные через /setinfo."
        : "Please set your data using /setinfo first."
    );
    return;
  }

  const date = new Date().toISOString().split("T")[0];
  const prompt = promptTemplate
    .replace(/\{\{date\}\}/g, date)
    .replace(/\{\{userData\.birthday\}\}/g, userData.birthday)
    .replace(/\{\{userData\.birthplace\}\}/g, userData.birthplace);

  const response = await generateResponse(prompt, userData, userData.language);
  bot.sendMessage(chatId, response);
}

bot.onText(/\/today/, (msg) => {
  const prompt = "Generate a horoscope for {{date}} for someone born on {{userData.birthday}} in {{userData.birthplace}}.";
  handleHoroscopeCommand(msg, prompt);
});

bot.onText(/\/tomorrow/, (msg) => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const prompt = `Create a horoscope for ${tomorrow}, for someone born on {{userData.birthday}} in {{userData.birthplace}}.`;
  handleHoroscopeCommand(msg, prompt);
});

bot.onText(/\/year/, (msg) => {
  const prompt =
    "Create an annual horoscope for someone born on {{userData.birthday}} in {{userData.birthplace}}. Focus on growth and opportunities.";
  handleHoroscopeCommand(msg, prompt);
});

// Graceful Shutdown
process.once("SIGINT", async () => {
  console.log("SIGINT received. Closing MongoDB...");
  await client.close();
  process.exit(0);
});

process.once("SIGTERM", async () => {
  console.log("SIGTERM received. Closing MongoDB...");
  await client.close();
  process.exit(0);
});
