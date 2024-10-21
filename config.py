from dotenv import load_dotenv
import os
import openai  # Add this import

# Load environment variables from .env file
load_dotenv()

# Access your OpenAI API key
openai.api_key = os.getenv('OPENAI_API_KEY')
