import openai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

openai.api_key = os.getenv('OPENAI_API_KEY')

# Example request to OpenAI's GPT-4 with the latest version syntax
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are an astrology assistant."},
        {"role": "user", "content": "Tell me about my horoscope today."}
    ],
    temperature=0.7
)

# Print the response
if "choices" in response and len(response["choices"]) > 0:
    print(response['choices'][0]['message']['content'])
else:
    print("No response from the model.")
