const OpenAI = require("openai"); // Import OpenAI library
const TelegramBot = require("node-telegram-bot-api"); // Import Telegram bot API
const { MongoClient } = require("mongodb"); // Import MongoDB library
require("dotenv").config(); // Import dotenv to load .env variables

// Initialize OpenAI client using the key from your .env file
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a Telegram bot instance using your bot token from the environment variables
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Initialize MongoDB client
const mongoUri = process.env.MONGO_URI; // MongoDB URI in your .env file
const client = new MongoClient(mongoUri);
let db;

// Connect to MongoDB
(async () => {
  try {
    await client.connect();
    db = client.db("astrologyBotDB");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
})();

// Helper function to save user data
async function saveUserData(userId, data) {
  try {
    const usersCollection = db.collection("users");
    await usersCollection.updateOne(
      { userId },
      { $set: { ...data } },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error saving user data:", error);
  }
}

// Helper function to get user data
async function getUserData(userId) {
  try {
    const usersCollection = db.collection("users");
    return await usersCollection.findOne({ userId });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

// Helper function to generate OpenAI response
async function generateResponse(prompt, userData, language) {
  try {
    const systemPrompt =
      language === "RU"
        ? "Ты профессиональный астролог и психолог с более чем 50-летним опытом. Ты предоставляешь подробные астрологические прогнозы и психологические советы для решения жизненных проблем. Отвечай только на русском языке."
        : "You are a professional astrologer and psychologist with over 50 years of experience. Provide detailed astrological insights and psychological advice to help users navigate life challenges. Respond only in English.";

    const context = userData
      ? `The user is named ${userData.name}, born on ${userData.birthday}, in ${userData.birthplace}. ${
          userData.birthtime
            ? `Their birth time is ${userData.birthtime}.`
            : "The birth time is not available."
        }`
      : "No user details are available.";

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
    console.error("OpenAI Error:", error.response ? error.response.data : error.message);
    return language === "RU"
      ? "Произошла ошибка при создании вашего прогноза."
      : "An error occurred while generating your horoscope.";
  }
}

// Command: /start with language selection
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

// Handle language selection
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const language = query.data === "LANG_RU" ? "RU" : "ENG";

  await saveUserData(chatId, { language });

  const welcomeMessage =
    language === "RU"
      ? "Добро пожаловать! Я ваш астрологический бот. Используйте /help, чтобы увидеть доступные команды."
      : "Welcome! I am your Astrology Bot. Use /help to see available commands.";

  bot.sendMessage(chatId, welcomeMessage);
});

// Command: /help
bot.onText(/\/help/, async (msg) => {
  const userId = msg.chat.id;
  const userData = await getUserData(userId);
  const language = userData?.language || "ENG";

  const helpText =
    language === "RU"
      ? `
Доступные команды:
- /today - Гороскоп на сегодня.
- /tomorrow - Гороскоп на завтра.
- /year - Годовой прогноз.
- /compatibility - Прогноз совместимости.
- /viewinfo - Посмотреть сохранённые данные.
- /setinfo - Добавить или обновить ваши данные.
`
      : `
Available commands:
- /today - Get today's horoscope.
- /tomorrow - Get tomorrow's horoscope.
- /year - Get your annual forecast.
- /compatibility - Get a compatibility forecast.
- /viewinfo - View your saved information.
- /setinfo - Add or update your personal information.
`;

  bot.sendMessage(userId, helpText);
});

// Command: /today
bot.onText(/\/today/, async (msg) => {
  const chatId = msg.chat.id;
  const userData = await getUserData(chatId);

  if (!userData?.birthday || !userData?.birthplace) {
    const message =
      userData?.language === "RU"
        ? "Пожалуйста, установите ваши данные с помощью /setinfo перед использованием этой команды."
        : "Please set up your birthday and birthplace using /setinfo before using this command.";
    bot.sendMessage(chatId, message);
  } else {
    const today = new Date().toISOString().split("T")[0];
    const prompt = `Provide a horoscope for ${today} for someone born on ${userData.birthday} in ${userData.birthplace}.`;
    const horoscope = await generateResponse(prompt, userData, userData.language);
    bot.sendMessage(chatId, horoscope);
  }
});

// Handle random user input
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text.startsWith("/")) return;

  const userData = await getUserData(chatId);
  const language = userData?.language || "ENG";

  if (!userData?.birthday || !userData?.birthplace) {
    const message =
      language === "RU"
        ? "Пожалуйста, используйте /setinfo для добавления данных перед задаванием вопросов."
        : "Please use /setinfo to add your details before asking questions.";
    bot.sendMessage(chatId, message);
    return;
  }

  const response = await generateResponse(text, userData, language);
  bot.sendMessage(chatId, response);
});

// Graceful shutdown
process.once("SIGINT", () => {
  bot.stop("SIGINT");
  client.close();
});
process.once("SIGTERM", () => {
  bot.stop("SIGTERM");
  client.close();
});
