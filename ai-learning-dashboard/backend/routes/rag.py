"""RAG routes: ingest documents, query with retrieval-augmented generation."""

import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import providers
import vector_store

router = APIRouter(prefix="/rag", tags=["rag"])


def _chunk_text(text: str, chunk_size: int = 300, overlap: int = 50) -> list[str]:
    """Split text into overlapping word-count chunks."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return [c for c in chunks if c.strip()]


class IngestRequest(BaseModel):
    text: str = Field(..., min_length=10)
    source: str = "user_input"
    chunk_size: int = Field(300, ge=50, le=1000)
    overlap: int = Field(50, ge=0, le=200)


class IngestResponse(BaseModel):
    chunks_created: int
    chunk_ids: list[str]
    total_stored: int


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=3)
    n_results: int = Field(3, ge=1, le=10)


class RetrievedChunk(BaseModel):
    text: str
    score: float
    metadata: dict


class QueryResponse(BaseModel):
    answer: str
    retrieved_chunks: list[RetrievedChunk]
    provider: str


class ClearResponse(BaseModel):
    deleted: int


@router.post("/ingest", response_model=IngestResponse)
async def ingest(req: IngestRequest):
    chunks = _chunk_text(req.text, req.chunk_size, req.overlap)
    if not chunks:
        raise HTTPException(status_code=400, detail="No text content to ingest.")
    try:
        embeddings = await providers.embed(chunks)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Embedding failed: {e}")

    metadatas = [{"source": req.source, "chunk_index": i} for i in range(len(chunks))]
    ids = vector_store.add_documents(chunks, embeddings, metadatas)
    return IngestResponse(
        chunks_created=len(ids),
        chunk_ids=ids,
        total_stored=vector_store.count(),
    )


@router.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    if vector_store.count() == 0:
        raise HTTPException(status_code=400, detail="No documents ingested yet. Use /rag/ingest first.")

    try:
        q_embeddings = await providers.embed([req.question])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Embedding failed: {e}")

    chunks = vector_store.query(q_embeddings[0], n_results=req.n_results)
    context = "\n\n---\n\n".join(c["text"] for c in chunks)

    system = (
        "You are a precise Q&A assistant. Answer the question using ONLY the provided context. "
        "If the answer is not in the context, say so explicitly. Be concise."
    )
    prompt = f"Context:\n{context}\n\nQuestion: {req.question}"

    try:
        answer = await providers.complete(prompt=prompt, system=system, max_tokens=512, temperature=0.2)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM completion failed: {e}")

    info = providers.get_provider_info()
    return QueryResponse(
        answer=answer,
        retrieved_chunks=[RetrievedChunk(**c) for c in chunks],
        provider=info["provider"],
    )


@router.delete("/clear", response_model=ClearResponse)
async def clear():
    deleted = vector_store.clear()
    return ClearResponse(deleted=deleted)


@router.get("/stats")
async def stats():
    return {"total_chunks": vector_store.count()}
