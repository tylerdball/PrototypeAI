# RACI Project Manager

Interactive RACI matrix management for projects and initiatives.

## Features

- Project CRUD and project-scoped roster management
- Task/workstream CRUD with status and due date tracking
- RACI assignment editor with validation (exactly one `A` per task)
- Due-this-week digest view
- Deterministic alerts (missing accountability, overloaded accountable owners)
- AI assists:
  - Suggest RACI assignments for a task
  - Explain health flags with recommended actions
  - Draft stakeholder summary
- CSV export for matrix data
- Tokenized read-only share links with revoke support

## Stack

- Frontend: Next.js 14 + TypeScript + Tailwind (port 3004)
- Backend: FastAPI + SQLite (port 8004)
- AI: Anthropic/OpenAI/Ollama via provider abstraction (default: Ollama)

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8004
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3004`.

## Environment

`backend/.env`:

```
AI_PROVIDER=ollama
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
DB_PATH=./raci_project_manager.db
```

## API overview

- `GET/POST /projects`
- `GET/PATCH/DELETE /projects/{id}`
- `GET/POST /projects/{id}/people`
- `DELETE /projects/{id}/people/{person_id}`
- `GET/POST /projects/{id}/tasks`
- `GET/PATCH/DELETE /projects/{id}/tasks/{task_id}`
- `PUT /projects/{id}/tasks/{task_id}/assignments`
- `GET /projects/{id}/matrix`
- `GET /projects/{id}/digest?window=week`
- `GET /projects/{id}/alerts`
- `GET /projects/{id}/export.csv`
- `GET/POST /projects/{id}/share-tokens`
- `DELETE /projects/{id}/share-tokens/{token}`
- `GET /share/{token}`
- `POST /projects/{id}/ai/suggest-assignments`
- `POST /projects/{id}/ai/flags`
- `POST /projects/{id}/ai/stakeholder-summary`
