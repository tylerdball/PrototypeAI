import os
from dotenv import load_dotenv
from openai import AsyncOpenAI
import anthropic

load_dotenv()

AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")


async def chat(prompt: str) -> str:
    if AI_PROVIDER == "anthropic":
        client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text

    # OpenAI or Ollama (OpenAI-compatible)
    base_url = None if AI_PROVIDER == "openai" else f"{OLLAMA_BASE_URL}/v1"
    api_key = os.getenv("OPENAI_API_KEY") if AI_PROVIDER == "openai" else "ollama"
    model = "gpt-4o-mini" if AI_PROVIDER == "openai" else "llama3.2:3b"

    client = AsyncOpenAI(base_url=base_url, api_key=api_key)
    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    return response.choices[0].message.content
