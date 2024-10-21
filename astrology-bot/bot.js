const OpenAI = require('openai');  // Import OpenAI library
require('dotenv').config();  // Import dotenv to load .env variables

// Initialize OpenAI client using the key from your .env file
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY  // Pull API key from .env file
});

// Example GPT-4 Request
async function getHoroscope() {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",  // Specify GPT-4 model
      messages: [
        { 
          role: "system", 
          content: "You are an expert astrologer with over 50 years of professional experience, providing detailed, fair, and accurate astrological readings. Your goal is to offer thoughtful, truthful forecasts that help guide users based on deep astrological insights, not just generic horoscopes." 
        },
        { 
          role: "user", 
          content: "Tell me about my horoscope today." 
        }
      ],
      temperature: 0.7,
    });

    console.log(response.choices[0].message.content);  // Log the response
  } catch (error) {
    console.error("Error fetching horoscope:", error.response ? error.response.data : error.message);  // Error handling
  }
}

getHoroscope();  // Call the function to fetch the horoscope
