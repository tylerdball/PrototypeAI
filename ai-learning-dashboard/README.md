# AI Concepts Learning Dashboard

Interactive deep-dives into LLMs, RAG, MLOps, Model Drift, and Model Registry — for ML practitioners who want to go deeper.

## Modules

| Module | Key Concepts | Live Features |
|---|---|---|
| **LLMs** | Tokenization, temperature, context window, hallucination | Tokenizer visualizer, completion playground with sliders |
| **RAG** | Embed → chunk → retrieve → augment → generate | Ingest text, ask questions, see retrieved chunks |
| **MLOps** | Pipelines, experiment tracking, canary deployment | Simulated experiment tracker with metrics comparison |
| **Model Drift** | Data drift vs. concept drift, PSI, KL divergence | Interactive chart showing distribution shift over time |
| **Model Registry** | Versioning, staging, promotion, lineage | Interactive model card list with stage promotion controls |
| **AI Features** | Summarization, classification, extraction, structured output | Live examples of each pattern against user input |

## Quick Start

### 1. Backend

```bash
cd backend
cp ../.env.example .env        # edit .env with your API key
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at http://localhost:8000. API docs at http://localhost:8000/docs.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000.

## Configuration

Edit `backend/.env`:

```
AI_PROVIDER=anthropic          # anthropic | openai | ollama
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...          # also used for embeddings with Anthropic provider
OLLAMA_BASE_URL=http://localhost:11434
```

**Embedding note:** Claude/Anthropic doesn't provide an embeddings endpoint. The RAG module uses OpenAI embeddings if `OPENAI_API_KEY` is set, otherwise falls back to deterministic pseudo-embeddings (for demo purposes only — not semantic).

## Architecture

```
frontend/  — Next.js 14 (App Router) + TypeScript + Tailwind CSS + Recharts
backend/   — FastAPI + ChromaDB + tiktoken + anthropic/openai SDKs
```

The backend proxies all LLM calls through `providers.py`, making it trivial to swap providers. The frontend routes all `/api/backend/*` requests through Next.js rewrites to `localhost:8000`.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/llm/complete` | Provider-agnostic completion |
| POST | `/llm/tokenize` | Tokenize text with tiktoken |
| GET  | `/llm/provider` | Current provider info |
| POST | `/rag/ingest` | Chunk + embed + store text |
| POST | `/rag/query` | Retrieve + generate answer |
| DELETE | `/rag/clear` | Wipe vector store |
| POST | `/drift/simulate` | Generate synthetic drift data |
| GET  | `/health` | Health check |
