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

// Save user data to MongoDB
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

// Fetch user data from MongoDB
async function getUserData(userId) {
  try {
    const usersCollection = db.collection("users");
    return await usersCollection.findOne({ userId });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

// Generate response using OpenAI
async function generateResponse(prompt, userData, language) {
  try {
    const systemPrompt =
      language === "RU"
      ? "Ты заботливый астролог и психолог, с более 50 летним опытом, помогающий людям находить ответы и поддержку. Отвечай с теплом, правдиво, пониманием и профессионализмом, помогая пользователям справляться с их жизненными трудностями."
      : "You are a compassionate astrologer and psychologist with over 50 years of experience, helping people find answers and support. Respond with warmth, honesty, understanding, and professionalism, guiding users through their life's challenges.";

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
    console.error("OpenAI Error:", error.response ? error.response.data : error.message);
    return language === "RU"
      ? "Произошла ошибка при генерации ответа."
      : "An error occurred while generating the response.";
  }
}

// Start command
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

// Language selection
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const language = query.data === "LANG_RU" ? "RU" : "ENG";

  await saveUserData(chatId, { language });

  const welcomeMessage =
    language === "RU"
      ? "Привет! Я ваш астрологический помощник и гид. Используйте /help, чтобы узнать доступные команды и начать наш диалог"
      : "Hi! I’m your astrology assistant and guide. Use /help to explore the available commands and start our conversation.";

      bot.sendMessage(chatId, welcomeMessage);
    });
    
    // Help command
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
            ? "Сначала введите данные через /setinfo."
            : "Set your data via /setinfo first."
        );
        return;
      }
    
      const today = new Date().toISOString().split("T")[0];
  const prompt = `Generate a friendly, calming horoscope for ${today} based on ${userData.birthday} and ${userData.birthplace}.`;
  const response = await generateResponse(prompt, userData, userData.language);
  bot.sendMessage(chatId, response);
});

// Tomorrow horoscope
bot.onText(/\/tomorrow/, async (msg) => {
  const chatId = msg.chat.id;
  const userData = await getUserData(chatId);

  if (!userData?.birthday || !userData?.birthplace) {
    bot.sendMessage(
      chatId,
      userData?.language === "RU"
        ? "Сначала введите данные через /setinfo."
        : "Set your data via /setinfo first."
    );
    return;
  }

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const prompt = `Create a soothing and uplifting horoscope for ${dateString}, tailored to someone born on ${userData.birthday} in ${userData.birthplace}. Focus on positivity and gentle guidance.`;
  const response = await generateResponse(prompt, userData, userData.language);
  bot.sendMessage(chatId, response);
});


bot.onText(/\/year/, async (msg) => {
  const chatId = msg.chat.id;
  const userData = await getUserData(chatId);

  if (!userData?.birthday || !userData?.birthplace) {
    bot.sendMessage(
      chatId,
      userData?.language === "RU"
        ? "Сначала введите данные через /setinfo."
        : "Please set your data via /setinfo first."
    );
    return;
  }
  const prompt = `Create a detailed and encouraging annual horoscope for someone born on ${userData.birthday} in ${userData.birthplace}, focusing on personal growth, opportunities, and guidance for navigating challenges.`;
  const response = await generateResponse(prompt, userData, userData.language);
  bot.sendMessage(chatId, response);
});

bot.onText(/\/compatibility/, async (msg) => {
  const chatId = msg.chat.id;
  const userData = await getUserData(chatId);

  if (!userData?.birthday || !userData?.birthplace) {
    bot.sendMessage(
      chatId,
      userData?.language === "RU"
        ? "Сначала введите данные через /setinfo."
        : "Please set your data via /setinfo first."
    );
    return;
  }

  const prompt = `Provide a thoughtful analysis of astrological compatibility for someone born on ${userData.birthday}, focusing on key strengths, challenges, and ways to foster harmony in relationships`;
const response = await generateResponse(prompt, userData, userData.language);
  bot.sendMessage(chatId, response);
});

bot.onText(/\/viewinfo/, async (msg) => {
  const chatId = msg.chat.id;
  const userData = await getUserData(chatId);

  if (!userData) {
    bot.sendMessage(chatId, "No information found. Use /setinfo to add your details.");
    return;
  }

  const userInfo =
    userData.language === "RU"
      ? `Ваши данные:\nИмя: ${userData.name}\nДата рождения: ${userData.birthday}\nМесто: ${userData.birthplace}\nВремя: ${userData.birthtime || "Не указано"}`
      : `Your details:\nName: ${userData.name}\nBirthday: ${userData.birthday}\nBirthplace: ${userData.birthplace}\nTime: ${userData.birthtime || "Not provided"}`;
  bot.sendMessage(chatId, userInfo);
});

bot.onText(/\/setinfo/, async (msg) => {
  const chatId = msg.chat.id;
  const userData = await getUserData(chatId);
  const language = userData?.language || "ENG";

  const message =
    language === "RU"
      ? "Введите данные: Имя, Дата рождения (YYYY-MM-DD), Место рождения, Время рождения (опционально)."
      : "Enter your details: Name, Birthday (YYYY-MM-DD), Birthplace, and Birth Time (optional).";

  bot.sendMessage(chatId, message, { reply_markup: { force_reply: true } });
});

    // Handle user input for /setinfo
    bot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;
    
      if (text.startsWith("/") || !text.includes("Name:")) return; // Ignore other commands or unrelated messages
    
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
            : "Your details have been saved!";
        bot.sendMessage(chatId, successMessage);
      } catch (error) {
        const errorMessage =
          (await getUserData(chatId))?.language === "RU"
            ? "Ошибка. Убедитесь, что вы ввели данные в правильном формате."
            : "Error. Please ensure you entered the details in the correct format.";
        bot.sendMessage(chatId, errorMessage);
      }
    });
    
    // Handle personal questions and general text
    bot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;
    
      if (text.startsWith("/")) return; // Skip if it's a command
    
      const userData = await getUserData(chatId);
      const language = userData?.language || "ENG";
    
      if (!userData?.birthday || !userData?.birthplace) {
        bot.sendMessage(
          chatId,
          language === "RU"
            ? "Сначала введите данные через /setinfo."
            : "Please set your data via /setinfo first."
        );
        return;
      }
    
      const prompt = `Provide an insightful and honest response to this user’s question, while maintaining a supportive and conversational tone. Focus on clarity, guidance, and empowering them to navigate their situation. The user is named ${userData.name}, born on ${userData.birthday}, in ${userData.birthplace}.${
        userData.birthtime ? ` Their birth time is ${userData.birthtime}.` : ""
      } User question: "${text}"`;
      const response = await generateResponse(prompt, userData, language);
      bot.sendMessage(chatId, response);
    });
    
    // Graceful shutdown
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
    