"""Provider-agnostic AI wrapper for Anthropic/OpenAI/Ollama — with vision support."""

import os
import base64

from dotenv import load_dotenv

load_dotenv()

PROVIDER = os.getenv("AI_PROVIDER", "ollama")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")


def _detect_media_type(image_base64: str) -> str:
    """Detect image media type from base64 magic bytes."""
    try:
        header = base64.b64decode(image_base64[:16] + "==")[:4]
        if header[:4] == b"\x89PNG":
            return "image/png"
        if header[:3] == b"GIF":
            return "image/gif"
        if header[:4] == b"RIFF":
            return "image/webp"
    except Exception:
        pass
    return "image/jpeg"  # default fallback


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
        model=model or ("llama3.1:8b" if PROVIDER == "ollama" else "gpt-4o-mini"),
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        **kwargs,
    )
    return response.choices[0].message.content or ""


async def complete_with_vision(
    prompt: str,
    image_base64: str,
    system: str = "You are a UX expert analyst.",
    max_tokens: int = 4000,
    model: str | None = None,
) -> str:
    if PROVIDER == "anthropic":
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model=model or "claude-sonnet-4-6",
            max_tokens=max_tokens,
            system=system,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": _detect_media_type(image_base64),
                                "data": image_base64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        return response.content[0].text

    if PROVIDER == "ollama":
        client = _openai_client(base_url=f"{OLLAMA_BASE_URL}/v1", api_key="ollama")
        try:
            response = await client.chat.completions.create(
                model=model or "llava",
                max_tokens=max_tokens,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{_detect_media_type(image_base64)};base64,{image_base64}"
                                },
                            },
                            {"type": "text", "text": prompt},
                        ],
                    }
                ],
            )
            return response.choices[0].message.content or ""
        except Exception:
            # Fall back to text-only
            return await complete(prompt, system=system, max_tokens=max_tokens)

    # OpenAI provider
    client = _openai_client(api_key=OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model=model or "gpt-4o",
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{_detect_media_type(image_base64)};base64,{image_base64}"
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            },
        ],
    )
    return response.choices[0].message.content or ""


def get_provider_info() -> dict:
    return {
        "provider": PROVIDER,
        "has_anthropic_key": bool(ANTHROPIC_API_KEY),
        "has_openai_key": bool(OPENAI_API_KEY),
        "ollama_url": OLLAMA_BASE_URL,
    }
