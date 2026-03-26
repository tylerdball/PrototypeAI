# AI UX Review Tool

Automated usability audits powered by AI. Upload a screenshot or paste a description, and the tool evaluates your UI against Nielsen's 10 Usability Heuristics — scoring each one, flagging issues, and suggesting concrete fixes. A before/after compare mode lets you measure UX improvements between two versions.

## Stack

| Layer    | Technology                          | Port |
|----------|-------------------------------------|------|
| Backend  | Python 3.11 + FastAPI + uvicorn     | 8007 |
| Frontend | Next.js 14 (TypeScript) + Tailwind  | 3007 |
| Vision   | Claude Sonnet (Anthropic) via base64 image |      |
| Fallback | Ollama (llava for images, llama3 for text) |      |

## Setup

### Backend

```powershell
cd ai-ux-review
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY (or set AI_PROVIDER=ollama for local)
```

### Frontend

```powershell
cd ai-ux-review/frontend
npm install
```

## Start

**Backend** (from `ai-ux-review/`):

```powershell
uvicorn main:app --reload --port 8007
```

**Frontend** (from `ai-ux-review/frontend/`):

```powershell
npm run dev
```

Frontend opens at http://localhost:3007, API docs at http://localhost:8007/docs.

## Environment Variables

| Variable            | Default                        | Description                                |
|---------------------|--------------------------------|--------------------------------------------|
| `AI_PROVIDER`       | `ollama`                       | `anthropic`, `openai`, or `ollama`         |
| `ANTHROPIC_API_KEY` | —                              | Required when `AI_PROVIDER=anthropic`      |
| `OPENAI_API_KEY`    | —                              | Required when `AI_PROVIDER=openai`         |
| `OLLAMA_BASE_URL`   | `http://localhost:11434`       | Ollama endpoint (local models)             |

## API Endpoints

| Method | Path          | Description                                                 |
|--------|---------------|-------------------------------------------------------------|
| GET    | `/health`     | Liveness check; returns provider config                     |
| GET    | `/heuristics` | List all 10 Nielsen heuristics with descriptions            |
| POST   | `/review`     | Analyze a single UI (image or description) against heuristics |
| POST   | `/compare`    | Compare before/after versions and surface deltas            |

## Curl Examples

### POST /review — text description

```bash
curl -X POST http://localhost:8007/review \
  -H "Content-Type: application/json" \
  -d '{
    "description": "A checkout form with 12 fields, no inline validation, and a single Submit button.",
    "context": "E-commerce checkout on mobile web",
    "focus_areas": [5, 9]
  }'
```

`focus_areas` takes a list of heuristic IDs (1–10). An empty list evaluates all 10.

### POST /review — with image

Base64-encode your screenshot first:

```powershell
# PowerShell
$bytes = [System.IO.File]::ReadAllBytes("screenshot.png")
$b64 = [Convert]::ToBase64String($bytes)
```

Then send it:

```bash
curl -X POST http://localhost:8007/review \
  -H "Content-Type: application/json" \
  -d "{
    \"image_base64\": \"$b64\",
    \"description\": \"Mobile onboarding screen\",
    \"context\": \"First-time user flow\"
  }"
```

Vision analysis requires `AI_PROVIDER=anthropic` (Claude) or `AI_PROVIDER=ollama` with the `llava` model pulled.

### POST /compare — before/after

```bash
curl -X POST http://localhost:8007/compare \
  -H "Content-Type: application/json" \
  -d '{
    "before": {
      "description": "Old checkout: 12 fields, no validation, no progress indicator.",
      "context": "Version 1.0"
    },
    "after": {
      "description": "New checkout: 5 fields, inline validation, 3-step progress bar.",
      "context": "Version 2.0"
    },
    "context": "Mobile e-commerce checkout redesign"
  }'
```

Response includes per-heuristic deltas, an `overall_delta`, and `improvements`/`regressions` lists.

## Ollama Fallback

Set `AI_PROVIDER=ollama` in `.env` to run entirely locally — no API key required.

- Text-only reviews use `llama3.1:8b` by default.
- Image reviews use `llava`. Pull it first: `ollama pull llava`.
- If `llava` fails for vision, the engine falls back to text-only analysis automatically.

Quality will be lower than Claude for complex UIs, but it works offline.

## Nielsen's 10 Heuristics Reference

| ID | Heuristic Name |
|----|----------------|
| 1  | Visibility of System Status |
| 2  | Match Between System and the Real World |
| 3  | User Control and Freedom |
| 4  | Consistency and Standards |
| 5  | Error Prevention |
| 6  | Recognition Rather Than Recall |
| 7  | Flexibility and Efficiency of Use |
| 8  | Aesthetic and Minimalist Design |
| 9  | Help Users Recognize, Diagnose, and Recover From Errors |
| 10 | Help and Documentation |

Scores are 0–10 per heuristic. Severity bands: **ok** (7–10), **warning** (4–6.9), **critical** (0–3.9).
