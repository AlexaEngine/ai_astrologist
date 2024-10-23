const OpenAI = require('openai');  // Import OpenAI library
require('dotenv').config();  // Import dotenv to load .env variables
const TelegramBot = require('node-telegram-bot-api');  // Import Telegram bot API

// Initialize OpenAI client using the key from your .env file
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY  // Pull API key from .env file
});

// Create a Telegram bot instance using your bot token from the environment variables
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Handle /start command to welcome the user
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to your Astrology Bot! Please enter your astrological query.");
});

// Handle messages from the user
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  if (userMessage === '/start') return;  // Skip handling the start message again

  try {
    // Make a request to GPT-4
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert astrologer with over 50 years of professional experience, providing detailed, fair, and accurate astrological readings."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      temperature: 0.7,
    });

    const botResponse = response.choices[0].message.content;

    // Send the GPT-4 response back to the Telegram user
    bot.sendMessage(chatId, botResponse);
  } catch (error) {
    console.error("Error fetching horoscope:", error.response ? error.response.data : error.message);
    bot.sendMessage(chatId, "Sorry, something went wrong while fetching your horoscope.");
  }
});
