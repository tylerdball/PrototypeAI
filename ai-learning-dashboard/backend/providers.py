"""Provider-agnostic AI abstraction layer.

Supports Claude (Anthropic), OpenAI-compatible, and Ollama.
Configure via environment variables:
  AI_PROVIDER=anthropic|openai|ollama
  ANTHROPIC_API_KEY=...
  OPENAI_API_KEY=...
  OLLAMA_BASE_URL=http://localhost:11434
"""

import os
from typing import AsyncGenerator

from dotenv import load_dotenv

load_dotenv()

PROVIDER = os.getenv("AI_PROVIDER", "anthropic")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")


def _get_anthropic_client():
    import anthropic
    return anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)


def _get_openai_client(base_url: str | None = None, api_key: str | None = None):
    from openai import AsyncOpenAI
    return AsyncOpenAI(
        api_key=api_key or OPENAI_API_KEY or "ollama",
        base_url=base_url,
    )


async def complete(
    prompt: str,
    system: str = "You are a helpful AI assistant.",
    max_tokens: int = 1024,
    temperature: float = 0.7,
    model: str | None = None,
) -> str:
    """Single-turn completion. Returns the full response text."""
    provider = PROVIDER

    if provider == "anthropic":
        client = _get_anthropic_client()
        m = model or "claude-sonnet-4-6"
        response = await client.messages.create(
            model=m,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    elif provider == "openai":
        client = _get_openai_client()
        m = model or "gpt-4o-mini"
        response = await client.chat.completions.create(
            model=m,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content or ""

    elif provider == "ollama":
        client = _get_openai_client(
            base_url=f"{OLLAMA_BASE_URL}/v1",
            api_key="ollama",
        )
        m = model or "llama3.2:3b"
        response = await client.chat.completions.create(
            model=m,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content or ""

    raise ValueError(f"Unknown provider: {provider}")


async def embed(texts: list[str]) -> list[list[float]]:
    """Generate embeddings. Uses OpenAI or Ollama; falls back to simple hash for Claude-only setups."""
    provider = PROVIDER

    if provider == "openai":
        client = _get_openai_client()
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=texts,
        )
        return [item.embedding for item in response.data]

    elif provider == "ollama":
        client = _get_openai_client(
            base_url=f"{OLLAMA_BASE_URL}/v1",
            api_key="ollama",
        )
        response = await client.embeddings.create(
            model="nomic-embed-text",
            input=texts,
        )
        return [item.embedding for item in response.data]

    else:
        # Anthropic doesn't have an embeddings endpoint; fall back to OpenAI if key exists
        if OPENAI_API_KEY:
            client = _get_openai_client()
            response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=texts,
            )
            return [item.embedding for item in response.data]
        # Last resort: deterministic pseudo-embeddings (demo only, not semantic)
        import hashlib
        import struct
        result = []
        for text in texts:
            dims = 384
            vec = []
            seed = text.encode()
            for i in range(dims):
                h = hashlib.sha256(seed + i.to_bytes(4, "little")).digest()
                val = struct.unpack("f", h[:4])[0]
                vec.append(val)
            norm = sum(v * v for v in vec) ** 0.5 or 1.0
            result.append([v / norm for v in vec])
        return result


def get_provider_info() -> dict:
    return {
        "provider": PROVIDER,
        "has_anthropic_key": bool(ANTHROPIC_API_KEY),
        "has_openai_key": bool(OPENAI_API_KEY),
        "ollama_url": OLLAMA_BASE_URL,
    }
