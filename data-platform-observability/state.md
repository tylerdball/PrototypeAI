# Data Platform Observability — State

## Status: Complete

## Dev commands
```powershell
# Backend (port 8005) — seed once on first run
cd backend
pip install -r requirements.txt
copy .env.example .env
python seed.py        # loads 12 datasets, 13 SLOs, 14 pipelines
uvicorn main:app --reload --port 8005

# Frontend (port 3005)
cd frontend
npm install
npm run dev
```

## Architecture
- **Frontend:** Next.js 14, TypeScript, Tailwind — light color scheme (--bg: #f5f8fb)
- **Backend:** FastAPI on port 8005
- **AI:** Ollama (llama3.2:3b) or Anthropic/OpenAI via `providers.py`
- **DB:** SQLite (`observability.db`) — datasets, slos, pipelines tables
- **Proxy:** `app/api/backend/[...path]/route.ts` → `127.0.0.1:8005`

## Key features
- Summary cards: total datasets, SLO coverage gap, failing SLOs, pipeline health
- Dataset catalog table with filters: search, domain, owner team, SLO state, pipeline state
- Pipeline health list — click degraded/failed to expand error message
- Dataset detail page: SLO progress bars, linked pipelines with success rate
- NL query bar: ask in plain English → AI translates to filters → results highlighted
- Seed data includes realistic failure scenarios (inventory pipeline down, SLO breaches)

## Data model
- `datasets` — name, description, owner_team, owner_person, domain, source_system, format, update_frequency, tags
- `slos` — dataset_id, slo_type (freshness/completeness/accuracy/availability), target_value, current_value, unit, status
- `pipelines` — dataset_id, name, status, last_run_at, avg_duration_mins, success_rate_7d, error_message

## NL query approach
LLM receives question + schema context → returns JSON filter spec → backend applies filters. No SQL generation — structured filter object is safer and more reliable with small models.

## Known constraints
- SLO current_value is static seed data — no live pipeline integration
- NL query reliability depends on model; llama3.2:3b works well for simple filters
