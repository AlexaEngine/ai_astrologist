Astrology Telegram Bot
This repository contains an astrology bot built using Python, OpenAI's GPT-4 API, and Telegram Bot API. The bot provides astrological insights and allows users to interact with it through natural language. It supports multiple languages and can translate non-English queries using deep_translator.

Features
Astrological Assistance: Provides astrological forecasts, insights, and horoscope readings.
Multi-Language Support: Detects the user's language and translates the conversation into English for better interaction with the OpenAI API.
Conversation History: The bot remembers previous conversations with users and provides contextual responses based on prior messages.
GPT-4 Integration: Uses OpenAI's GPT-4 model for high-quality, detailed, and professional astrological insights.
Translation with Deep Translator: Translates user queries and bot responses if needed, providing a seamless multilingual experience.
Requirements
Python 3.8+
A Telegram Bot API token (create a bot via BotFather on Telegram)
An OpenAI API key (sign up at OpenAI to obtain your API key)
The following Python packages:
bash
Copy code
pip install -r requirements.txt
Setup
Clone the repository:
bash
Copy code
git clone https://github.com/AlexaEngine/astrology_bot.git
cd astrology_bot
Set up your environment:

Create a .env file in the root directory of your project and add your API keys:
makefile
Copy code
OPENAI_API_KEY=<Your OpenAI API Key>
TELEGRAM_BOT_TOKEN=<Your Telegram Bot Token>
Install dependencies:
bash
Copy code
pip install -r requirements.txt
Run the bot:
bash
Copy code
python astrology_bot.py
How It Works
Users can interact with the bot by sending messages to it on Telegram.
The bot detects the language of the user's input and translates it into English (if necessary) using deep_translator.
It then queries OpenAI's GPT-4 model with the translated text and provides a detailed response based on the user's query.
The bot will reply in the user's original language if translation is required.
Example Usage
To start a conversation with the bot:
bash
Copy code
/start
Example user query:
perl
Copy code
Tell me my horoscope for today.
Contributing
Feel free to fork this repository and submit pull requests. Any contributions to improve the functionality or performance are welcome.

License
This project is licensed under the MIT License.

