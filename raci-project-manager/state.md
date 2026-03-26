# RACI Project Manager - State

## Status
v2 complete — iterating on UX and features

## Built

- FastAPI backend on port 8004
- SQLite schema: projects, people, teams, task_groups, tasks, task_assignments, team_task_assignments, share_tokens
- RACI validation enforcing exactly one `A` per task (across people + teams combined)
- Matrix, digest, alerts, CSV export, and share-link endpoints
- AI endpoints: assignment suggestion, health flags, stakeholder summary, project template generation, suggest-from-existing
- Next.js frontend on port 3004:
  - Project list/create/delete + AI template creation (fresh or from existing projects)
  - Workspace tabs: Tasks, Matrix, Due This Week, AI Assist, Share/Export
  - Task groups/phases with section dividers in task list and matrix
  - Teams/departments as assignees alongside individuals in the matrix
  - Compact RACI legend on matrix tab
  - Status displayed as proper case (Not Started, In Progress, etc.)
  - Due dates shown in matrix task cells
  - AI templates populate task due dates from suggested offsets
  - Read-only share page (supports people + teams + groups)
- Ollama model upgraded from llama3.2:3b → llama3.1:8b

## Start commands

```powershell
# Backend
cd raci-project-manager/backend
uvicorn main:app --reload

# Frontend
cd raci-project-manager/frontend
npm run dev
```

## Next session — backlog

- **Look & feel** — overall theme is too dark; explore lightening the UI (surface colors, contrast, readability)
- **AI Assist — model selector** — allow user to choose/configure the AI model being used from within the UI
- **AI Assist — Suggest RACI** — filter the task dropdown to exclude tasks that already have all assignees set; only show tasks that are incomplete or unassigned
- **Default tab** — Matrix should be the landing tab when opening a project, not Tasks
- **Inline editing** — People, Teams/Depts, and Groups/Phases can only be deleted and recreated; add inline edit (rename, update description/title/email) without needing to delete and re-add
- **Configurable alerts** — allow users to configure alert thresholds (e.g. overload threshold >3 is hardcoded; missing-A logic) and potentially add new alert types
