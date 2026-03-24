"""Provider-agnostic AI wrapper for Anthropic/OpenAI/Ollama."""

import os

from dotenv import load_dotenv

load_dotenv()

PROVIDER = os.getenv("AI_PROVIDER", "ollama")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")


def _openai_client(base_url: str | None = None, api_key: str | None = None):
    from openai import AsyncOpenAI

    return AsyncOpenAI(api_key=api_key or OPENAI_API_KEY or "ollama", base_url=base_url)


async def complete(
    prompt: str,
    system: str = "You are a helpful assistant.",
    max_tokens: int = 1000,
    temperature: float = 0.2,
    model: str | None = None,
    json_mode: bool = False,
) -> str:
    if PROVIDER == "anthropic":
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model=model or "claude-sonnet-4-6",
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    client = _openai_client(
        base_url=f"{OLLAMA_BASE_URL}/v1" if PROVIDER == "ollama" else None,
        api_key="ollama" if PROVIDER == "ollama" else OPENAI_API_KEY,
    )

    kwargs = {}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = await client.chat.completions.create(
        model=model or ("llama3.2:3b" if PROVIDER == "ollama" else "gpt-4o-mini"),
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        **kwargs,
    )
    return response.choices[0].message.content or ""


def get_provider_info() -> dict:
    return {
        "provider": PROVIDER,
        "has_anthropic_key": bool(ANTHROPIC_API_KEY),
        "has_openai_key": bool(OPENAI_API_KEY),
        "ollama_url": OLLAMA_BASE_URL,
    }
