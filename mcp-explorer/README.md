# MCP Explorer

An interactive tool for learning, building, and testing Model Context Protocol (MCP) servers.

## What it does

- **Learn** — Visual walkthrough of MCP concepts: tools, resources, prompts, and transport
- **Examples** — Browse and live-test three pre-built MCP servers (calculator, text analyzer, date tools). See their tool schemas and run real calls
- **Build** — Define your own tools (name, description, parameters), generate a working Python MCP server, and test it immediately

## What is MCP?

MCP (Model Context Protocol) is the standard protocol for connecting LLMs to external tools and data sources. Instead of hardcoding tool logic into your application, you define MCP servers that expose tools — and any MCP-compatible client (Claude Desktop, Claude Code, etc.) can use them.

## Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS — port 3002
- **Backend:** FastAPI + uvicorn, Python 3.13 — port 8002
- **MCP:** `mcp` Python SDK (FastMCP high-level API for servers, ClientSession for testing)

## Setup

### Prerequisites
- Python 3.13+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

### Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:3002
```

## Example Servers

| Server | Tools |
|---|---|
| Calculator | add, subtract, multiply, divide, power |
| Text Analyzer | word_count, sentence_count, reading_time, top_words |
| Date Tools | today, days_between, add_days, what_day_is |

## Build Your Own

1. Go to the **Build** tab
2. Add tools — name, description, and typed parameters
3. Click **Generate Server** — get a working Python MCP server using FastMCP
4. Click **Test** to run a live tool call against your generated server
