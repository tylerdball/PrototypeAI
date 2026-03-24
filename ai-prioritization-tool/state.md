# AI Prioritization Tool — State

## Status: Functional but needs UI polish

> **Note:** The frontend was rebuilt from scratch (March 2026) after source files were lost in a monorepo consolidation. The current UI is functional but noticeably less polished than the original — the look and feel needs work to match the quality of the other prototypes. Prioritise UI refinement before sharing this tool.

## What it does
Score and rank a backlog of items against configurable strategic criteria using AI.
Each item is sent to the LLM in parallel. Results are sorted by weighted score and exportable as CSV.

## Dev commands
```bash
# Backend (port 8001)
cd backend && uvicorn main:app --reload --port 8001

# Frontend (port 3001)
cd frontend && npm run dev
```

## Architecture
- **Frontend:** Next.js 14, TypeScript, Tailwind — single-page tool at `app/page.tsx`
- **Backend:** FastAPI on port 8001 — `routes/prioritize.py` handles scoring
- **AI:** Ollama (llama3.2:3b) via `providers.py` — same abstraction as ai-learning-dashboard
- **Proxy:** `app/api/backend/[...path]/route.ts` → `127.0.0.1:8001` with 5-min timeout

## Key features
- Configurable criteria with names, descriptions, and weights (Low/Med/High)
- Bulk item input: `Title | Description` format, one per line
- Items scored in parallel (asyncio.gather) — N items = N simultaneous LLM calls
- Results table: overall score bar, per-criterion scores (1-5), recommendation badge (HIGH/MEDIUM/LOW/DEFER)
- Click any row to expand per-criterion reasoning
- Export to CSV (all scores + reasoning)

## Default criteria
1. Platform Leverage (High weight)
2. Customer / User Value (High weight)
3. Strategic Alignment (Med weight)
4. Technical Debt Relief (Med weight)
5. Delivery Confidence (Low weight)

## Known constraints
- In-memory only — no session persistence between page reloads
- LLM JSON parsing uses regex extraction + fallback — occasionally a score may be missing if model produces malformed output (shown as "—")
- Large batches (>20 items) can be slow on local Ollama

## Potential next steps
- Save/load sessions to localStorage
- Import from CSV or Jira-style export
- Add scoring history / compare runs
- Custom recommendation thresholds (currently: ≥70=HIGH, ≥45=MEDIUM, else LOW)
