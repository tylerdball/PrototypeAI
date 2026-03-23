# MCP Explorer — State

## Status: ✅ Complete (initial build)

## What It Does
A three-tab learning and exploration tool for Model Context Protocol (MCP) servers:

1. **Learn tab** — MCP concepts, request/response flow diagram, annotated FastMCP code snippet
2. **Examples tab** — Browse and live-test three pre-built MCP servers (Calculator, Text Analyzer, Date Tools). Select a server, see its tools with input schemas, fill arguments, run the tool, see results.
3. **Build tab** — Tool definition wizard → generated FastMCP server code → live test against the generated code in a temp subprocess

## Architecture

```
mcp-explorer/
├── backend/               # FastAPI on port 8002
│   ├── main.py
│   ├── mcp_runner.py      # Spawns MCP servers via stdio_client, calls tools
│   ├── code_generator.py  # Template-based FastMCP code generation
│   ├── routes/
│   │   └── mcp_routes.py  # /mcp/servers, /mcp/servers/{id}/tools, /mcp/call, /mcp/generate, /mcp/test-custom
│   └── servers/           # Example FastMCP servers
│       ├── calculator.py  # add, subtract, multiply, divide, power
│       ├── text_analyzer.py # word_count, sentence_count, reading_time, top_words
│       └── date_tools.py  # today, days_between, add_days, what_day_is
│
└── frontend/              # Next.js 14 on port 3002
    ├── app/
    │   ├── page.tsx        # Three-tab interface
    │   ├── layout.tsx
    │   └── api/backend/[...path]/route.ts  # Proxy to backend (port 8002)
    └── tailwind.config.ts
```

## Tech Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS — port 3002
- **Backend:** FastAPI + uvicorn — port 8002
- **MCP:** `mcp>=1.0.0` Python SDK (FastMCP high-level API + ClientSession stdio transport)

## How to Run

```bash
# Backend
cd backend
uvicorn main:app --reload --port 8002

# Frontend (separate terminal)
cd frontend
npm run dev
# Open http://localhost:3002
```

## Example Servers

| Server | Tools |
|--------|-------|
| Calculator | add, subtract, multiply, divide, power |
| Text Analyzer | word_count, sentence_count, reading_time, top_words |
| Date Tools | today, days_between, add_days, what_day_is |

## Known Limitations / Future Work
- Code generation is template-based (not LLM-powered) — could add AI-assisted tool generation
- No persistence for custom-built servers
- Could add more example servers (file system, HTTP client, database)
- Could add a "Deploy to Claude Desktop" config snippet
