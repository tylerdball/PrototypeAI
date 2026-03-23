"""In-memory numpy vector store for the RAG demo (no C extensions required)."""

import uuid
from typing import Any

import numpy as np

_documents: list[str] = []
_embeddings: list[list[float]] = []
_metadatas: list[dict] = []
_ids: list[str] = []


def add_documents(texts: list[str], embeddings: list[list[float]], metadatas: list[dict] | None = None) -> list[str]:
    """Store chunks with their pre-computed embeddings. Returns assigned IDs."""
    ids = [str(uuid.uuid4()) for _ in texts]
    _documents.extend(texts)
    _embeddings.extend(embeddings)
    _metadatas.extend(metadatas or [{} for _ in texts])
    _ids.extend(ids)
    return ids


def query(embedding: list[float], n_results: int = 3) -> list[dict[str, Any]]:
    """Return the top-n most similar chunks using cosine similarity."""
    if not _embeddings:
        return []

    q = np.array(embedding, dtype=np.float32)
    matrix = np.array(_embeddings, dtype=np.float32)

    # Cosine similarity: dot(q, doc) / (|q| * |doc|)
    q_norm = np.linalg.norm(q)
    doc_norms = np.linalg.norm(matrix, axis=1)
    scores = (matrix @ q) / (doc_norms * q_norm + 1e-10)

    top_n = min(n_results, len(_documents))
    top_indices = np.argsort(scores)[::-1][:top_n]

    return [
        {"text": _documents[i], "score": round(float(scores[i]), 4), "metadata": _metadatas[i]}
        for i in top_indices
    ]


def clear() -> int:
    """Wipe all stored documents. Returns count deleted."""
    count = len(_documents)
    _documents.clear()
    _embeddings.clear()
    _metadatas.clear()
    _ids.clear()
    return count


def count() -> int:
    return len(_documents)
