# Prototype Ideas

A backlog of prototype concepts tailored to Tyler's background, domain, and interests.
Pick one and create a new top-level directory (e.g., `api-governance/`) to get started.

---

## Platform & Work

### 1. API Governance Dashboard
Visualise an API inventory across teams: endpoints, owners, versions, deprecation timelines, consumer counts.
AI layer drafts deprecation notices or changelogs from a diff.
**Why:** Directly maps to external API strategy ownership. Good Python + REST practice.
**Stack:** Next.js dashboard, FastAPI backend, SQLite or JSON file store, Ollama for changelog generation.

### 2. AI-Assisted Prioritization Tool
Paste or upload a backlog of feature requests. Define strategic criteria (platform leverage, reuse, tech debt, revenue impact).
LLM scores each item against the criteria and explains its reasoning. Export as a ranked table.
**Why:** You do this manually today. This prototype makes the reasoning explicit and auditable.
**Stack:** Next.js, FastAPI, CSV/JSON upload, Ollama completions.

### 3. Architecture Decision Record (ADR) Tracker
Store ADRs and use AI to generate two views of each: technical summary for engineers, plain-English business impact for executives.
RAG over your ADR history so you can ask "what decisions have we made about authentication?" or "what's still open?"
**Why:** You're the connective tissue between engineering and stakeholders — this is a tool for that exact role.
**Stack:** Next.js, FastAPI, markdown file store, RAG pipeline (reuse ai-learning-dashboard's vector store pattern).

### 4. Data Platform Observability Dashboard
Dataset catalog with ownership, SLOs, pipeline health indicators, and a natural language query interface.
Ask questions like "which datasets owned by team X have no SLO defined?" or "show me all pipelines with no owner".
**Why:** You run a Unified Data Platform. This prototype is a lightweight version of what a real data catalog does.
**Stack:** Next.js, FastAPI, pandas for data wrangling, Ollama for NL-to-filter translation.

---

## AI & Data

### 5. Synthetic Data Generator
Generate realistic synthetic datasets for testing, demos, or model training — without using real customer data.
Define a schema (field names, types, constraints, relationships), and the tool generates N rows of plausible data.
Add a "persona mode" for user data: generates synthetic users with coherent names, ages, locations, and behaviours.
**Why:** Critical for anyone building AI pipelines who can't use production data in dev/test environments.
**Stack:** FastAPI, Pydantic schema definition, Ollama for text fields (names, descriptions, notes), pandas + numpy for numerical distributions. CSV/JSON export.

---

## UX & Design

### 6. AI UX Review Tool
Paste a screenshot or describe a UI. The tool runs it through a structured UX heuristic evaluation (Nielsen's 10 heuristics)
and returns a scored report: what's working, what's broken, and specific improvement suggestions.
Add a "before/after" mode: describe a change, get AI-generated critique of both states.
**Why:** Bridges your PM/product sense with a structured design framework. Useful for reviewing designs from your teams.
**Stack:** Next.js, FastAPI, Claude vision API (image input) or text-only mode with Ollama, structured JSON output rendered as a report card.

---

## Developer Tools & AI Infrastructure

### 9. MCP Server Explorer & Learning Tool
An interactive tool for learning, building, and testing Model Context Protocol (MCP) servers.
Shows how MCP works — tools, resources, and prompts — with live examples you can run against a real MCP server.
Includes a "build your own" wizard: define a tool (name, description, input schema), generate the server code, and test it immediately.
**Why:** MCP is becoming the standard way to extend Claude and other LLMs with custom tools. Understanding it is directly relevant to building AI-powered platform features. Great for learning how tool-use actually works under the hood.
**Stack:** Next.js, FastAPI, `mcp` Python SDK, Ollama or Claude for the LLM side. Spawns a local MCP server as a subprocess and talks to it via stdio transport.

---

## Personal & Interests

### 7. Personal Interest Tracker
A lightweight hub that tracks and connects your interests: music (artists, gigs, playlists), D&D campaigns (sessions, NPCs, loot, open plot threads), books/theatre, and workouts.
AI layer: weekly digest summarising activity across interests, D&D session recap generator from notes, music recommendation based on mood.
**Why:** Good excuse to build a multi-model, multi-entity data app. Covers CRUD, relationships, and AI summarisation in a context you'll actually use.
**Stack:** Next.js, FastAPI, SQLite (multiple tables), Ollama for digests and D&D content.

### 10. RACI Project Manager
Interactive tool for building, tracking, and maintaining RACI matrices across projects and initiatives.
Define projects with tasks/workstreams, assign R/A/C/I roles per person, and track completion status.
AI layer suggests RACI assignments based on a task description and the team roster, flags missing accountabilities or overloaded owners, and drafts a stakeholder summary from the matrix.
Reminder system: per-task due dates with a "what's due this week" digest view. Export to CSV or a shareable read-only view.
**Why:** RACI is universally used in platform/data/PM work but usually lives in a spreadsheet that goes stale. This makes it interactive and auditable — directly relevant to running a team.
**Stack:** Next.js, FastAPI, SQLite (projects → tasks → assignments), Ollama for AI suggestions and stakeholder summaries, date-based reminder logic.

---

### 8. D&D Campaign AI Assistant
Campaign manager with NPC generator (personality, backstory, secrets), encounter builder (party level → CR-appropriate enemies),
and session notes summariser that extracts open plot threads and unresolved hooks.
RAG over your campaign notes so you can ask "what did the party promise the blacksmith?" or "which NPCs know about the cult?"
**Why:** Covers LLM completions, RAG, and structured output all in one project. Feedback loop is immediate and fun.
**Stack:** Next.js, FastAPI, RAG pipeline, Ollama (llama3.2:3b for generation, nomic-embed-text for campaign note search).

---

## Status

| # | Name | Status |
|---|------|--------|
| — | AI Learning Dashboard | ✅ Complete — `ai-learning-dashboard/` |
| 2 | AI-Assisted Prioritization Tool | ✅ Complete — `ai-prioritization-tool/` |
| 1 | API Governance Dashboard | Not started |
| 3 | ADR Tracker | Not started |
| 4 | Data Platform Observability Dashboard | Not started |
| 5 | Synthetic Data Generator | Not started |
| 6 | AI UX Review Tool | Not started |
| 7 | Personal Interest Tracker | Not started |
| 8 | D&D Campaign AI Assistant | Not started |
| 9 | MCP Server Explorer & Learning Tool | ✅ Complete — `mcp-explorer/` |
| 10 | RACI Project Manager | Not started |
