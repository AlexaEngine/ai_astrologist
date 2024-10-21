from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters
import openai
from langdetect import detect
from deep_translator import GoogleTranslator
import os

# In-memory storage for conversation history per user
conversation_history = {}

# Detect the language of the user input using langdetect
def detect_language(text):
    try:
        detected_lang = detect(text)  # Use langdetect to detect the language
        return detected_lang
    except Exception as e:
        print(f"Error detecting language: {e}")
        return 'en'  # Default to English if detection fails

# Translate the text if needed using deep_translator's GoogleTranslator
def translate_text(text, target_language):
    try:
        return GoogleTranslator(source='auto', target=target_language).translate(text)
    except Exception as e:
        print(f"Error translating text: {e}")
        return text  # Return original text if translation fails

# Start command to welcome the user
async def start(update: Update, context):
    await update.message.reply_text("Welcome to your Astrology Bot! Please enter your astrological query.")

# Main message handler with memory for conversations
async def handle_message(update: Update, context):
    user_id = update.message.from_user.id
    user_message = update.message.text

    try:
        # Initialize or retrieve conversation history
        if user_id not in conversation_history:
            conversation_history[user_id] = []

        # Detect language of the user message
        detected_language = detect_language(user_message)

        # If the language is not English, translate it to English for OpenAI
        if detected_language != 'en':
            user_message_translated = translate_text(user_message, 'en')
        else:
            user_message_translated = user_message

        # Add the user's message to the conversation history
        conversation_history[user_id].append({"role": "user", "content": user_message_translated})

        # Limit history length to avoid memory overload (last 10 messages)
        if len(conversation_history[user_id]) > 10:
            conversation_history[user_id] = conversation_history[user_id][-10:]

        # Query OpenAI's GPT-4 model with conversation history
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=conversation_history[user_id],
            temperature=0.7
        )

        bot_response = response['choices'][0]['message']['content']

        # Add the bot's response to the conversation history
        conversation_history[user_id].append({"role": "assistant", "content": bot_response})

        # If the original message was not in English, translate the response back to the original language
        if detected_language != 'en':
            bot_response_translated = translate_text(bot_response, detected_language)
        else:
            bot_response_translated = bot_response

        await update.message.reply_text(bot_response_translated)

    except Exception as e:
        await update.message.reply_text(f"Sorry, something went wrong: {str(e)}")

# Main function to run the bot
def main():
    app = ApplicationBuilder().token(os.getenv('TELEGRAM_BOT_TOKEN')).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("Bot is running...")
    app.run_polling()

if __name__ == '__main__':
    main()
