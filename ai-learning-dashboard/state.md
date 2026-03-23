# AI Learning Dashboard — State

## Status: Complete — on GitHub (pushed)

## What's built and working

### Backend (`/backend` — FastAPI, Python 3.13, port 8000)
- `providers.py` — provider-agnostic AI wrapper (Anthropic / OpenAI / Ollama)
- `vector_store.py` — in-memory numpy cosine similarity store (replaced ChromaDB for Python 3.13 compat)
- `routes/llm.py` — `/llm/complete`, `/llm/tokenize`, `/llm/provider`
- `routes/rag.py` — `/rag/ingest`, `/rag/query`, `/rag/clear`, `/rag/stats`
- `routes/drift.py` — `/drift/simulate`

**AI provider:** Ollama (local)
- Completions: `llama3.2:3b`
- Embeddings: `nomic-embed-text`

**Known constraints:**
- Vector store is in-memory — resets on backend restart
- No auth, no persistence layer

### Frontend (`/frontend` — Next.js 14, TypeScript, Tailwind, port 3000)
- Dashboard home — module cards with descriptions
- `/modules/llms` — tokenizer + completion playground (temp/token sliders) ✅ live AI
- `/modules/rag` — ingest text, ask questions, see retrieved chunks ✅ live AI
- `/modules/model-drift` — drift chart with synthetic data from backend ✅
- `/modules/model-registry` — interactive model card UI (static) ✅
- `/modules/mlops` — pipeline stages + experiment tracker (static) ✅
- `/modules/ai-features` — summarization/classification/extraction demos ✅ live AI

**Proxy:** `app/api/backend/[...path]/route.ts` — catches all `/api/backend/*` and forwards to `127.0.0.1:8000` with 5-minute timeout (replaces Next.js rewrite which had IPv6/timeout issues on Windows)

## Dev commands
```bash
# Backend
cd backend && uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm run dev
```

## Completed modules

### ~~Prompt Engineering~~ ✅ `/modules/prompt-engineering`
- Zero-shot / few-shot / chain-of-thought side-by-side comparison
- Preset tasks + free input, live prompt inspector, "Run All Three" button

### ~~Guardrails & Safety~~ ✅ `/modules/guardrails`
- PII detection, content safety classifier, prompt injection detector, output sanitizer
- All four demos use `/llm/complete` with specialised system prompts + JSON output

### ~~Fine-tuning vs RAG~~ ✅ `/modules/finetuning-vs-rag`
- Interactive yes/no decision tree → recommendation
- Comparison table (7 dimensions)
- Live side-by-side: same question with vs without injected context

### ~~AI Evaluation (Evals)~~ ✅ `/modules/evals`
- Live BLEU-1/BLEU-2/Precision/Recall/F1 calculator (pure TypeScript, updates as you type)
- LLM-as-judge: scores two responses head-to-head with per-criterion ratings
- Concept cards: reference-based vs LLM-judge vs human eval

## Next steps
- No planned modules. Suggest new ones as needed.

## Tech decisions / gotchas
- Python 3.13 incompatible with `chromadb` and `tiktoken==0.7.0` — use numpy vector store, `tiktoken>=0.8.0`
- Windows resolves `localhost` to `::1` (IPv6) but uvicorn binds to `127.0.0.1` — use explicit IP in proxy
- Ollama completions need explicit tag: `llama3.2:3b` not `llama3.2`
- Next.js rewrites time out on slow local LLM responses — use API route handler with `maxDuration = 300`
