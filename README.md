# Astrology Telegram Bot

This repository contains the code for an Astrology Telegram Bot, utilizing Python, OpenAI's GPT-4 API, and the Telegram Bot API. The bot provides personalized astrological insights and enables interactions through natural language processing. It supports multiple languages and utilizes the deep_translator library to handle non-English queries.

## Features
- **Astrological Assistance**: Delivers daily, monthly, and yearly horoscope readings along with real-time astrological forecasts.
- **Multi-Language Support**: Automatically detects the user's language and translates interactions for seamless communication with the OpenAI API.
- **Conversation History**: Maintains a log of previous interactions to provide context-aware responses and personalized guidance.
- **GPT-4 Integration**: Leverages the advanced capabilities of OpenAI's GPT-4 to generate accurate and insightful astrological predictions.
- **Translation with Deep Translator**: Facilitates understanding by translating user queries and bot responses as needed, ensuring accessibility for a global audience.

## Requirements
- Python 3.8 or newer.
- A Telegram Bot API token (obtainable through BotFather on Telegram).
- An OpenAI API key (register at OpenAI's platform to get your key).
- Access to a MongoDB database (for storing user sessions and interaction history).

### Installation
```bash
pip install -r requirements.txt
```

## Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/AlexaEngine/astrology_bot.git
   cd astrology_bot
   ```

2. **Environment Configuration:**
   Create a `.env` file in the project's root directory and add your API keys:
   ```plaintext
   OPENAI_API_KEY=<Your OpenAI API Key>
   TELEGRAM_BOT_TOKEN=<Your Telegram Bot Token>
   MONGO_URI=<Your MongoDB URI>
   GOOGLE_TIMEZONE_API_KEY=<Your Google Timezone API>
   ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Bot:**
   ```bash
   python astrology_bot.py
   ```

## How It Works
- Users initiate conversations by sending commands and queries to the bot on Telegram.
- The bot detects the input language, and if necessary, uses deep_translator to convert the message into English.
- It processes the translated text through the GPT-4 model to generate insightful responses.
- Responses are translated back to the user's original language if needed and sent as replies.

## Example Usage
- **Starting a conversation:**
  ```bash
  /start
  ```

- **Asking for a horoscope:**
  ```bash
  Tell me my horoscope for today.
  ```

## Contributing
Contributions are welcome! Feel free to fork this repository and submit pull requests to enhance the bot's functionality or improve its performance.

## License
This project is licensed under the MIT License - see the LICENSE file for details.