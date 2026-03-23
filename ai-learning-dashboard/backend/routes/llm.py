"""LLM routes: completion playground + tokenizer visualization."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import providers

router = APIRouter(prefix="/llm", tags=["llm"])


class CompleteRequest(BaseModel):
    prompt: str
    system: str = "You are a helpful AI assistant."
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(512, ge=1, le=4096)
    model: str | None = None


class CompleteResponse(BaseModel):
    text: str
    provider: str
    prompt_tokens: int
    completion_tokens: int


class TokenizeRequest(BaseModel):
    text: str
    model: str = "cl100k_base"  # tiktoken encoding name


class TokenizeResponse(BaseModel):
    tokens: list[str]
    token_ids: list[int]
    count: int


@router.post("/complete", response_model=CompleteResponse)
async def complete(req: CompleteRequest):
    try:
        text = await providers.complete(
            prompt=req.prompt,
            system=req.system,
            max_tokens=req.max_tokens,
            temperature=req.temperature,
            model=req.model,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Rough token count via tiktoken
    try:
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")
        prompt_tok = len(enc.encode(req.system + req.prompt))
        comp_tok = len(enc.encode(text))
    except Exception:
        prompt_tok = len((req.system + req.prompt).split())
        comp_tok = len(text.split())

    info = providers.get_provider_info()
    return CompleteResponse(
        text=text,
        provider=info["provider"],
        prompt_tokens=prompt_tok,
        completion_tokens=comp_tok,
    )


@router.post("/tokenize", response_model=TokenizeResponse)
async def tokenize(req: TokenizeRequest):
    try:
        import tiktoken
        enc = tiktoken.get_encoding(req.model)
        ids = enc.encode(req.text)
        tokens = [enc.decode([i]) for i in ids]
        return TokenizeResponse(tokens=tokens, token_ids=list(ids), count=len(ids))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/provider")
async def provider_info():
    return providers.get_provider_info()
