# AI Prioritization Tool

Score and rank your backlog against strategic criteria using a local LLM. Paste in your items, define what matters to your team, and get a ranked, reasoned output — exportable as CSV.

## What it does

- Define scoring criteria with names, descriptions, and weights (Low / Med / High)
- Add organisational context (OKRs, goals, strategy) that frames all scoring without being a criterion itself
- Paste backlog items in `Title | Description` format
- Score all items in parallel against your criteria — each item gets per-criterion scores (1–5), a weighted overall score, a recommendation (HIGH / MEDIUM / LOW / DEFER), and AI reasoning
- Export full results including reasoning to CSV

## Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS — port 3001
- **Backend:** FastAPI + uvicorn, Python 3.13 — port 8001
- **AI:** Ollama (local) via OpenAI-compatible API — `llama3.2:3b` by default

## Setup

### Prerequisites
- Python 3.13+
- Node.js 18+
- [Ollama](https://ollama.com) running locally with `llama3.2:3b` pulled

```bash
ollama pull llama3.2:3b
```

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # or create backend/.env — see Environment below
uvicorn main:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:3001
```

## Environment

Create `backend/.env`:

```
AI_PROVIDER=ollama
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
```

Supports `AI_PROVIDER=anthropic` or `openai` as drop-in alternatives — just add the relevant API key.

## Default Scoring Criteria

| Criterion | Weight | What it measures |
|---|---|---|
| Platform Leverage | High | Improves reusable infrastructure across teams |
| Customer / User Value | High | Directly benefits end users |
| Strategic Alignment | Med | Maps to OKRs and architectural direction |
| Technical Debt Relief | Med | Reduces debt, improves system health |
| Reduces Duplication | Med | Eliminates redundant implementations |
| Dependency Unblocking | Med | Unblocks other teams or initiatives |
| Risk / Reversibility | Med | Low score = high risk or hard to reverse |
| Developer Experience | Low | Makes it easier to build on the platform |
| Delivery Confidence | Low | Team can scope and deliver this well |

All criteria are editable — rename, reweight, add, or remove before scoring.

## Usage

1. Open `http://localhost:3001`
2. Expand **Organisational Context** and paste your OKRs or strategic priorities
3. Edit criteria weights to reflect your current priorities
4. Paste backlog items (one per line: `Title | Description`)
5. Click **Score N Items** — progress bar shows scoring in real time
6. Review results table — click any row to expand per-criterion reasoning
7. Export to CSV for sharing or further analysis
