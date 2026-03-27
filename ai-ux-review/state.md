# AI UX Review Tool — State

## Status
v2 — history + light/dark mode added

## Built

- FastAPI backend on port 8007
- Pydantic schemas: HeuristicId (1–10), Severity (ok/warning/critical), HeuristicScore, ReviewRequest (validator: requires image or description), SingleReviewResponse, CompareRequest, HeuristicDelta, CompareReviewResponse
- Endpoints: POST /review, POST /compare, GET /heuristics, GET /health
- History endpoints: GET /history, POST /history, GET /history/{id}, DELETE /history/{id} — JSON file storage (history.json, max 50 entries)
- providers.py — extends raci pattern with `complete_with_vision()`:
  - Anthropic: Claude Vision API (base64 image block, media type auto-detected from magic bytes)
  - Ollama: llava model via OpenAI-compat, falls back to text-only on error
  - OpenAI: gpt-4o with image_url content block
- analyzer/heuristics.py — all 10 Nielsen heuristics with descriptions, evaluation focus, examples
- analyzer/reviewer.py — ReviewEngine: builds structured LLM prompt, routes to vision or text, parses JSON, maps score → severity (≥7 ok, ≥4 warning, <4 critical), always returns exactly 10 items
- analyzer/comparator.py — ComparisonEngine: per-heuristic delta, improvements/regressions, LLM summary
- 18 tests passing (pytest) — analyzer unit tests + API integration tests
- Next.js frontend on port 3007:
  - Single Review mode: image upload (drag-and-drop), description textarea, focus areas checklist
  - Before & After mode: two upload zones side by side, comparison results with delta indicators
  - Results: overall score badge (color-coded), 10 heuristic cards with score bars, findings/suggestions
  - Save button in results header — saves to backend history with auto-generated title
  - History drawer (top bar button) — lists saved analyses with score/delta/date, click to restore, hover to delete
  - Light/dark mode toggle (top bar) — CSS variable theming, preference saved to localStorage
  - Proxy to backend at 8007

## Start commands

```powershell
# Backend
cd ai-ux-review
cp .env.example .env   # fill in ANTHROPIC_API_KEY
uvicorn main:app --reload --port 8007

# Frontend
cd ai-ux-review/frontend
npm run dev
```

## Environment

```
AI_PROVIDER=anthropic   # anthropic | ollama | openai
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434
```

## Next session — backlog

- **PDF/URL input** — accept a URL to screenshot automatically, or paste a PDF of a design spec
- **Report export** — download the full heuristic report as PDF or markdown
- **Rename saved analyses** — allow editing the auto-generated title on history entries
- **Custom rubric** — let users add their own evaluation criteria beyond Nielsen's 10
- **Annotation overlay** — for image reviews, overlay colored bounding boxes on the screenshot indicating which regions triggered each finding
