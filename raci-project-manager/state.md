# RACI Project Manager - State

## Status
In progress (v1 scaffold + core workflows implemented)

## Built

- FastAPI backend on port 8004
- SQLite schema and helper layer for projects/people/tasks/assignments/share tokens
- RACI validation enforcing exactly one `A` per task assignment update
- Matrix, digest, alerts, CSV export, and share-link endpoints
- AI endpoints for assignment suggestion, health flag narrative, stakeholder summary
- Next.js frontend on port 3004:
  - Project list/create/delete
  - Workspace tabs (Tasks, Matrix, Due This Week, AI Assist, Share/Export)
  - Read-only share page by token

## Next checks

- Run backend + frontend smoke test locally
- Validate AI responses against configured provider
- Add tests (backend route/integration and UI flow coverage)
