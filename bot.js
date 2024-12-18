const OpenAI = require("openai");
const TelegramBot = require("node-telegram-bot-api");
const { MongoClient } = require("mongodb");
const axios = require("axios");
const moment = require("moment-timezone");
require("dotenv").config();

// OpenAI Configuration
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// Utility Functions
async function saveUserData(userId, data) {
  try {
    await db.collection("users").updateOne({ userId }, { $set: { ...data } }, { upsert: true });
  } catch (error) {
    console.error("❌ Error saving user data:", error.message);
  }
}

async function getUserData(userId) {
  try {
    return await db.collection("users").findOne({ userId });
  } catch (error) {
    console.error("❌ Error fetching user data:", error.message);
    return null;
  }
}

async function generateResponse(prompt, userData, language) {
  const systemPrompt =
  language === "RU"
    ? "Ты чуткий психолог и опытный астролог. Поддерживай пользователя, помогая справляться с тревогой, болью и жизненными трудностями. Дай мудрые советы и предскажи важные моменты для их роста и исцеления."
    : "You are a compassionate psychologist and experienced astrologer. Support the user in overcoming anxiety, pain, and life challenges. Offer wise guidance and predict key moments for their growth and healing.";


  const context = userData
    ? `User info: Name: ${userData.name}, Birthday: ${userData.birthday}, Birthplace: ${userData.birthplace}.`
    : "No user details provided.";

  const fullPrompt = `${context}\n\n${prompt}`;
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: fullPrompt },
    ],
    temperature: 1.0,
  });
  return response.choices[0]?.message?.content || "No response generated.";
}

async function getTimezoneFromLocation(lat, lng) {
  const apiKey = process.env.GOOGLE_TIMEZONE_API_KEY;
  const timestamp = Math.floor(new Date().getTime() / 1000);

  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`
  );

  if (response.data.status === "OK") {
    return response.data.timeZoneId;
  } else {
    throw new Error("Invalid response from Timezone API");
  }
}

// Initialize Telegram Bot
async function startBot() {
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  console.log("🤖 Bot is running in polling mode...");

  // Command Handlers
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Choose your language / Выберите язык:", {
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
    bot.sendMessage(
      chatId,
      language === "RU"
        ? "Привет! Используйте /help для просмотра команд."
        : "Hello! Use /help to view the available commands."
    );
  });

  bot.onText(/\/help/, async (msg) => {
    const userData = await getUserData(msg.chat.id);
    const language = userData?.language || "ENG";
    const helpText =
      language === "RU"
        ? "Доступные команды:\n/setinfo - Ввести данные\n/viewinfo - Показать данные\n/today - Гороскоп на сегодня\n/tomorrow - Гороскоп на завтра\n/year - Годовой прогноз\n/settimezone - Установить часовой пояс (автоматически)\n/settimezone_manual - Установить часовой пояс вручную"
        : "Available commands:\n/setinfo - Enter your details\n/viewinfo - Show your details\n/today - Today's horoscope\n/tomorrow - Tomorrow's horoscope\n/year - Annual forecast\n/settimezone - Set timezone automatically\n/settimezone_manual - Set timezone manually";

    bot.sendMessage(msg.chat.id, helpText);
  });

  bot.onText(/\/setinfo/, async (msg) => {
    const chatId = msg.chat.id;
    const userLanguage = (await getUserData(chatId))?.language || "ENG";

    bot.sendMessage(
      chatId,
      userLanguage === "RU"
        ? "Пожалуйста, отправьте ваши данные в формате:\nИмя, Дата рождения (ГГГГ-ММ-ДД), Место рождения"
        : "Please send your details in this format:\nName, Birthday (YYYY-MM-DD), Birthplace"
    );

    bot.once("message", async (response) => {
      if (!response.text.includes(",")) {
        bot.sendMessage(
          chatId,
          userLanguage === "RU"
            ? "❌ Неверный формат. Пожалуйста, используйте: Имя, Дата рождения (ГГГГ-ММ-ДД), Место рождения."
            : "❌ Invalid format. Please use: Name, Birthday (YYYY-MM-DD), Birthplace."
        );
        return;
      }

      const [name, birthday, birthplace] = response.text.split(",").map((field) => field.trim());
      await saveUserData(chatId, { name, birthday, birthplace, language: userLanguage });

      bot.sendMessage(
        chatId,
        userLanguage === "RU" ? "✅ Ваши данные сохранены." : "✅ Your details have been saved."
      );
    });
  });
  // View Saved User Info
  bot.onText(/\/viewinfo/, async (msg) => {
    const userData = await getUserData(msg.chat.id);
    const language = userData?.language || "ENG";

    if (userData?.name && userData?.birthday && userData?.birthplace) {
      bot.sendMessage(
        msg.chat.id,
        language === "RU"
          ? `Ваши данные:\nИмя: ${userData.name}\nДата рождения: ${userData.birthday}\nМесто рождения: ${userData.birthplace}`
          : `Your details:\nName: ${userData.name}\nBirthday: ${userData.birthday}\nBirthplace: ${userData.birthplace}`
      );
    } else {
      bot.sendMessage(
        msg.chat.id,
        language === "RU"
          ? "Вы еще не ввели данные. Используйте /setinfo."
          : "You haven't entered any details yet. Use /setinfo."
      );
    }
  });

  // Today's Horoscope
  bot.onText(/\/today/, async (msg) => {
    const userData = await getUserData(msg.chat.id);
    const timezone = userData?.timezone || "UTC";

    const today = moment().tz(timezone).format("YYYY-MM-DD");
    const prompt = `Today's horoscope for ${today} for ${userData?.birthday || "unknown"} in ${
      userData?.birthplace || "unknown"
    }.`;

    const response = await generateResponse(prompt, userData, userData?.language || "ENG");
    bot.sendMessage(msg.chat.id, response);
  });

  // Tomorrow's Horoscope
  bot.onText(/\/tomorrow/, async (msg) => {
    const userData = await getUserData(msg.chat.id);
    const timezone = userData?.timezone || "UTC";

    const tomorrow = moment().tz(timezone).add(1, "days").format("YYYY-MM-DD");
    const prompt = `Tomorrow's horoscope for ${tomorrow} for ${userData?.birthday || "unknown"} in ${
      userData?.birthplace || "unknown"
    }.`;

    const response = await generateResponse(prompt, userData, userData?.language || "ENG");
    bot.sendMessage(msg.chat.id, response);
  });

  // Annual Forecast
  bot.onText(/\/year/, async (msg) => {
    const userData = await getUserData(msg.chat.id);
    const timezone = userData?.timezone || "UTC";

    try {
      if (!moment.tz.zone(timezone)) throw new Error("Invalid timezone.");
      const year = moment().tz(timezone).year();

      const prompt = `Annual forecast for the year ${year} for ${userData?.birthday || "unknown"} in ${
        userData?.birthplace || "unknown"
      }.`;

      const response = await generateResponse(prompt, userData, userData?.language || "ENG");
      bot.sendMessage(msg.chat.id, response);
    } catch (error) {
      bot.sendMessage(
        msg.chat.id,
        "There was an issue with your timezone. Please reset it using /settimezone."
      );
    }
  });

  // Set Timezone Automatically
  bot.onText(/\/settimezone/, async (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(
      chatId,
      "Please share your location so I can set your timezone automatically.",
      {
        reply_markup: {
          keyboard: [
            [
              {
                text: "📍 Share Location/Поделиться геолокацией",
                request_location: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );

    // Listen for location
    bot.once("location", async (response) => {
      try {
        const { latitude, longitude } = response.location;

        const timezone = await getTimezoneFromLocation(latitude, longitude);

        if (timezone) {
          await saveUserData(chatId, { timezone });
          bot.sendMessage(chatId, `✅ Timezone detected and set to "${timezone}".`);
        } else {
          bot.sendMessage(
            chatId,
            "❌ Unable to detect timezone. Please try again or set it manually using /settimezone_manual."
          );
        }
      } catch (error) {
        console.error("❌ Error detecting timezone:", error.message);
        bot.sendMessage(
          chatId,
          "❌ Something went wrong while setting your timezone. Please try again later."
        );
      }
    });
  });

// Set Timezone Manually
bot.onText(/\/settimezone_manual/, async (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Please provide your timezone manually (e.g., 'America/New_York' or '+3')."
  );

  bot.once("message", async (response) => {
    try {
      const timezone = response.text.trim();

      if (!moment.tz.zone(timezone) && !/^(\+|-)\d{1,2}$/.test(timezone)) {
        bot.sendMessage(msg.chat.id, "❌ Invalid timezone format. Try again.");
        return;
      }

      await saveUserData(msg.chat.id, { timezone });
      bot.sendMessage(msg.chat.id, `✅ Your timezone has been set to "${timezone}".`);
    } catch (error) {
      console.error("❌ Error saving timezone:", error.message);
      bot.sendMessage(msg.chat.id, "❌ Something went wrong. Please try again.");
    }
  });
});

// Random Message Response
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // Skip if msg.text is undefined or starts with "/"
  if (!msg.text || msg.text.startsWith("/")) return;

  const userData = await getUserData(chatId);
  const language = userData?.language || "ENG";
  const timezone = userData?.timezone || "UTC";
  const today = moment().tz(timezone).format("YYYY-MM-DD");

  const fullPrompt =
    language === "RU"
      ? `Вопрос пользователя: ${msg.text}. Сегодняшняя дата: ${today}.`
      : `User's question: ${msg.text}. Today's date: ${today}.`;

  const response = await generateResponse(fullPrompt, userData, language);
  bot.sendMessage(chatId, response);
});
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
