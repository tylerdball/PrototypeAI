# Synthetic Data Generator — State

## Status
v1 complete — all phases built and tested

## Built

- FastAPI backend on port 8006
- Schema-driven generation engine:
  - `int`, `float` — uniform / normal / exponential distributions via NumPy
  - `bool` — configurable true_probability
  - `enum` — picks from provided values list
  - `uuid` — uuid4, seeded for reproducibility
  - `date` — uniform distribution across start/end range
  - `email`, `phone` — static pool generation (firstname.lastname@domain, US format)
  - `str` — routed through Ollama (llama3.2), graceful fallback if unreachable
- Persona mode — richly correlated user profiles (15 identity/account fields + 5 behaviour fields)
  - Behaviour fields statistically correlated to lifetime_value and age
  - Uses Faker if available, falls back to static word lists
- Export layer — JSON and CSV via ExportWriter, streaming CSV via StreamingExporter
- Endpoints: POST /generate, POST /generate/stream, GET /schema/sample, GET /health
- Seed support — reproducible output across calls
- 39 tests passing (pytest) — generators + API integration
- Next.js frontend on port 3006:
  - Schema Builder — add/remove fields with conditional constraint editors per type
  - Persona Mode — toggle hides field builder, describes output fields
  - JSON results with syntax highlighting, CSV results as scrollable table
  - Download button for .json or .csv
  - Load Sample button prefills from GET /schema/sample

## Start commands

```powershell
# Backend
cd synthetic-data-generator
uvicorn main:app --reload --port 8006

# Frontend
cd synthetic-data-generator/frontend
npm run dev
```

## Next session — backlog

- **Relationships** — cross-field constraints (e.g. end_date > start_date, city consistent with state)
- **Preview mode** — generate a small sample (5 rows) inline before committing to full row count
- **Schema save/load** — persist named schemas to localStorage or a JSON file
- **Custom distributions** — let users paste in a frequency table for enum fields
- **Streaming UI** — wire the /generate/stream endpoint to show rows arriving live in the results panel
