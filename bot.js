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
        ? "Ты профессиональный астролог с более чем 50-летним опытом. Предоставляй подробные астрологические прогнозы только на русском языке."
        : "You are a professional astrologer with over 50 years of experience. Provide detailed astrological insights in English.";

    const context = userData
      ? `The user is ${userData.name}, born on ${userData.birthday}, in ${userData.birthplace}. ${
          userData.birthtime
            ? `Their birth time is ${userData.birthtime}.`
            : "Birth time is not provided."
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
      ? "Произошла ошибка при генерации прогноза."
      : "An error occurred while generating the horoscope.";
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
      ? "Добро пожаловать! Я ваш астрологический бот. Используйте /help, чтобы увидеть команды."
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
- /compatibility - Совместимость.
- /viewinfo - Посмотреть сохранённые данные.
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

// Command: /setinfo
bot.onText(/\/setinfo/, async (msg) => {
  const chatId = msg.chat.id;
  const language = (await getUserData(chatId))?.language || "ENG";

  const instructions =
    language === "RU"
      ? "Введите данные:\nИмя: [Ваше имя]\nДень рождения: [YYYY-MM-DD]\nМесто: [Город, Страна]\nВремя: [HH:MM] (необязательно)"
      : "Enter your details:\nName: [Your Name]\nBirthday: [YYYY-MM-DD]\nBirthplace: [City, Country]\nBirth Time: [HH:MM] (Optional)";

  bot.sendMessage(chatId, instructions, { reply_markup: { force_reply: true } });
});

// Handle user input for /setinfo
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text.startsWith("Name:")) {
    try {
      const lines = text.split("\n");
      const name = lines[0].split(":")[1]?.trim();
      const birthday = lines[1].split(":")[1]?.trim();
      const birthplace = lines[2].split(":")[1]?.trim();
      const birthtime = lines[3]?.split(":")[1]?.trim() || null;

      if (!name || !birthday || !birthplace) throw new Error("Missing fields");

      await saveUserData(chatId, { name, birthday, birthplace, birthtime });

      const successMessage =
        (await getUserData(chatId))?.language === "RU"
          ? "Данные успешно сохранены!"
          : "Your information has been saved!";
      bot.sendMessage(chatId, successMessage);
    } catch (error) {
      const errorMessage =
        (await getUserData(chatId))?.language === "RU"
          ? "Ошибка ввода. Следуйте инструкциям в /setinfo."
          : "Invalid format. Follow instructions in /setinfo.";
      bot.sendMessage(chatId, errorMessage);
    }
  }
});

// Command: /compatibility
bot.onText(/\/compatibility/, async (msg) => {
  const chatId = msg.chat.id;
  const userData = await getUserData(chatId);

  if (!userData?.birthday || !userData?.birthplace) {
    const errorMessage =
      userData?.language === "RU"
        ? "Сначала введите ваши данные через /setinfo."
        : "First, enter your details via /setinfo.";
    bot.sendMessage(chatId, errorMessage);
  } else {
    const prompt = `Analyze compatibility based on astrology for the user born on ${userData.birthday}.`;
    const response = await generateResponse(prompt, userData, userData.language);
    bot.sendMessage(chatId, response);
  }
});

// Command: /viewinfo
bot.onText(/\/viewinfo/, async (msg) => {
  const chatId = msg.chat.id;
  const userData = await getUserData(chatId);

  if (!userData) {
    bot.sendMessage(chatId, "No information found. Use /setinfo to provide details.");
    return;
  }

  const userInfo =
    userData.language === "RU"
      ? `Информация:\nИмя: ${userData.name || "Нет данных"}\nДень рождения: ${
          userData.birthday || "Нет данных"
        }\nМесто: ${userData.birthplace || "Нет данных"}\nВремя: ${
          userData.birthtime || "Нет данных"
        }`
      : `Stored info:\nName: ${userData.name || "Not provided"}\nBirthday: ${
          userData.birthday || "Not provided"
        }\nBirthplace: ${userData.birthplace || "Not provided"}\nBirth Time: ${
          userData.birthtime || "Not provided"
        }`;

  bot.sendMessage(chatId, userInfo);
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
