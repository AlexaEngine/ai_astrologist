const OpenAI = require("openai");
const TelegramBot = require("node-telegram-bot-api");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);
let db;

(async () => {
  try {
    await client.connect();
    db = client.db("astrologyBotDB");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
})();

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

async function getUserData(userId) {
  try {
    const usersCollection = db.collection("users");
    return await usersCollection.findOne({ userId });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

async function generateResponse(prompt, userData, language) {
  try {
    const systemPrompt =
      language === "RU"
        ? "Ты профессиональный астролог и психолог. Предоставляй гороскопы и поддерживай пользователей. Общайся только на русском."
        : "You are a professional astrologer and psychologist. Provide horoscopes and support users. Respond only in English.";

    const context = userData
      ? `The user is named ${userData.name}, born on ${userData.birthday}, in ${userData.birthplace}. ${
          userData.birthtime
            ? `Their birth time is ${userData.birthtime}.`
            : "The birth time is not available."
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
    console.error("OpenAI Error:", error.response ? error.response.data : error.message);
    return language === "RU"
      ? "Произошла ошибка при генерации ответа."
      : "An error occurred while generating the response.";
  }
}

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

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const language = query.data === "LANG_RU" ? "RU" : "ENG";

  await saveUserData(chatId, { language });

  const welcomeMessage =
    language === "RU"
      ? "Добро пожаловать! Я ваш астрологический бот. Используйте /help, чтобы увидеть команды."
      : "Welcome! I am your Astrology Bot. Use /help to see available commands.";

  bot.sendMessage(chatId, welcomeMessage);
});

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

  bot.sendMessage(userId, helpText);
});

bot.onText(/\/today/, async (msg) => {
  const chatId = msg.chat.id;
  const userData = await getUserData(chatId);

  if (!userData?.birthday || !userData?.birthplace) {
    bot.sendMessage(
      chatId,
      userData?.language === "RU"
        ? "Введите ваши данные через /setinfo."
        : "Set your data via /setinfo."
    );
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const prompt = `Provide a horoscope for ${today} for someone born on ${userData.birthday} in ${userData.birthplace}.`;
  const horoscope = await generateResponse(prompt, userData, userData.language);
  bot.sendMessage(chatId, horoscope);
});

bot.onText(/\/tomorrow/, async (msg) => {
  const chatId = msg.chat.id;
  const userData = await getUserData(chatId);

  if (!userData?.birthday || !userData?.birthplace) {
    bot.sendMessage(
      chatId,
      userData?.language === "RU"
        ? "Введите ваши данные через /setinfo."
        : "Set your data via /setinfo."
    );
    return;
  }

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const prompt = `Provide a horoscope for ${tomorrow} for someone born on ${userData.birthday} in ${userData.birthplace}.`;
  const horoscope = await generateResponse(prompt, userData, userData.language);
  bot.sendMessage(chatId, horoscope);
});

bot.onText(/\/year/, async (msg) => {
  const chatId = msg.chat.id;
  const userData = await getUserData(chatId);

  if (!userData?.birthday || !userData?.birthplace) {
    bot.sendMessage(
      chatId,
      userData?.language === "RU"
        ? "Введите ваши данные через /setinfo."
        : "Set your data via /setinfo."
    );
    return;
  }

  const prompt = `Provide an annual forecast for someone born on ${userData.birthday} in ${userData.birthplace}.`;
  const forecast = await generateResponse(prompt, userData, userData.language);
  bot.sendMessage(chatId, forecast);
});

// Add personal question handling
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text.startsWith("/")) return;

  const userData = await getUserData(chatId);
  const language = userData?.language || "ENG";

  if (!userData?.birthday || !userData?.birthplace) {
    bot.sendMessage(
      chatId,
      language === "RU"
        ? "Введите ваши данные через /setinfo."
        : "Set your data via /setinfo."
    );
    return;
  }

  const response = await generateResponse(text, userData, language);
  bot.sendMessage(chatId, response);
});

process.once("SIGINT", async () => {
  console.log("SIGINT received. Cleaning up...");
  await client.close();
  process.exit(0);
});

process.once("SIGTERM", async () => {
  console.log("SIGTERM received. Cleaning up...");
  await client.close();
  process.exit(0);
});
