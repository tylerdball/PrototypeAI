# D&D Campaign AI Assistant

AI-powered campaign manager for D&D 5e. Generate NPCs, design encounters, summarise session notes, and ask questions about your campaign using RAG.

## Features

- **NPC Generator** — describe a role/archetype, get a detailed NPC with personality, backstory, secret, motivation, and speech pattern
- **Encounter Builder** — specify party size, level, and difficulty; get CR-appropriate monsters with tactics
- **Session Notes** — paste raw notes; AI extracts plot threads, hooks, NPC interactions, and key events
- **Campaign Q&A** — ask natural language questions against your session notes ("what did the party promise the blacksmith?")

## Stack

- **Frontend:** Next.js + TypeScript + Tailwind CSS (port 3003)
- **Backend:** FastAPI + uvicorn (port 8003)
- **AI:** Configurable — Anthropic Claude, OpenAI, or Ollama (local)
- **Storage:** SQLite (persistent), in-memory numpy vector store for RAG

## Status

**Needs full rebuild.** The previous frontend scaffold hit an unresolvable "Invariant: Missing ActionQueueContext" error at the Next.js framework level — even on a bare static page with no app code. Root cause was never isolated despite matching package versions, clean installs, and clearing the build cache. Rebuild from scratch using `create-next-app`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | `anthropic` | `anthropic`, `openai`, or `ollama` |
| `ANTHROPIC_API_KEY` | — | Required if using Anthropic |
| `OPENAI_API_KEY` | — | Required if using OpenAI |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `DB_PATH` | `./dnd_assistant.db` | SQLite database file path |

### Ollama setup (local, no API key needed)

```powershell
ollama pull llama3.2:3b          # for generation
ollama pull nomic-embed-text     # for embeddings (RAG)
```

## Notes

- The RAG index (embeddings) is in-memory and lost on backend restart. Click **Rebuild Index** in the Session Notes tab to re-index from SQLite after a restart.
- All campaign data (NPCs, encounters, session notes) persists in `dnd_assistant.db`.
