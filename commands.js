const OpenAI = require("openai");
const axios = require("axios");
const moment = require("moment-timezone");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Utility Functions
async function saveUserData(db, userId, data) {
  try {
    await db.collection("users").updateOne({ userId }, { $set: { ...data } }, { upsert: true });
    console.log(`✅ User data saved for userId: ${userId}`);
  } catch (error) {
    console.error("❌ Error saving user data:", error.message);
  }
}

async function getUserData(db, userId) {
  try {
    const userData = await db.collection("users").findOne({ userId });
    console.log(`ℹ️ Fetched user data for userId: ${userId}`, userData);
    return userData;
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
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullPrompt },
      ],
      temperature: 1.0,
    });
    return response.choices[0]?.message?.content || "No response generated.";
  } catch (error) {
    console.error("❌ OpenAI API Error:", error.message);
    return language === "RU"
      ? "Произошла ошибка при генерации ответа. Пожалуйста, попробуйте позже."
      : "An error occurred while generating a response. Please try again later.";
  }
}

async function getTimezoneFromLocation(lat, lng) {
  const apiKey = process.env.GOOGLE_TIMEZONE_API_KEY;
  const timestamp = Math.floor(new Date().getTime() / 1000);

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`
    );

    if (response.data.status === "OK") {
      return response.data.timeZoneId;
    } else {
      throw new Error("Invalid response from Timezone API");
    }
  } catch (error) {
    console.error("❌ Error fetching timezone:", error.message);
    throw error;
  }
}

// Command Handlers
function handleCommands(bot, db) {
  bot.onText(/\/start/, (msg) => {
    console.log("ℹ️ /start command received");
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
    console.log("ℹ️ Callback query received:", query);
    const chatId = query.message.chat.id;
    const language = query.data === "LANG_RU" ? "RU" : "ENG";
    await saveUserData(db, chatId, { language });
    bot.sendMessage(
      chatId,
      language === "RU"
        ? "Привет! Используйте /help для просмотра команд."
        : "Hello! Use /help to view the available commands."
    );
  });

  bot.onText(/\/help/, async (msg) => {
    console.log("ℹ️ /help command received");
    const userData = await getUserData(db, msg.chat.id);
    const language = userData?.language || "ENG";
    const helpText =
      language === "RU"
        ? "Доступные команды:\n/setinfo - Ввести данные\n/viewinfo - Показать данные\n/today - Гороскоп на сегодня\n/tomorrow - Гороскоп на завтра\n/year - Годовой прогноз\n/settimezone - Установить часовой пояс (автоматически)\n/settimezone_manual - Установить часовой пояс вручную"
        : "Available commands:\n/setinfo - Enter your details\n/viewinfo - Show your details\n/today - Today's horoscope\n/tomorrow - Tomorrow's horoscope\n/year - Annual forecast\n/settimezone - Set timezone automatically\n/settimezone_manual - Set timezone manually";

    bot.sendMessage(msg.chat.id, helpText);
  });

  bot.onText(/\/setinfo/, async (msg) => {
    const chatId = msg.chat.id;
    const userLanguage = (await getUserData(db, chatId))?.language || "ENG";

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
      await saveUserData(db, chatId, { name, birthday, birthplace, language: userLanguage });

      bot.sendMessage(
        chatId,
        userLanguage === "RU" ? "✅ Ваши данные сохранены." : "✅ Your details have been saved."
      );
    });
  });

  bot.onText(/\/viewinfo/, async (msg) => {
    const userData = await getUserData(db, msg.chat.id);
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
}

// General Message Handler
async function handleMessage(bot, msg, db) {
  const chatId = msg.chat.id;

  if (!msg.text || msg.text.startsWith("/")) return;

  try {
    const userData = await getUserData(db, chatId);
    const language = userData?.language || "ENG";
    const timezone = userData?.timezone || "UTC";
    const today = moment().tz(timezone).format("YYYY-MM-DD");

    const fullPrompt =
      language === "RU"
        ? `Вопрос пользователя: ${msg.text}. Сегодняшняя дата: ${today}.`
        : `User's question: ${msg.text}. Today's date: ${today}.`;

    const response = await generateResponse(fullPrompt, userData, language);
    bot.sendMessage(chatId, response);
  } catch (error) {
    console.error("❌ Error handling message:", error.message);
  }
}

module.exports = { handleCommands, handleMessage };
