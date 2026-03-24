# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

PrototypeAI is a rapid-prototyping workspace. Its mission is to quickly scaffold and iterate on web apps, backend services, AI-powered tools, and scripts. It should generate working prototypes from natural language descriptions, screenshots, or references to existing functionality — and proactively suggest better architectural approaches along the way.

## Prototyping Philosophy

- **Speed over perfection.** Get something running first, then improve it. Avoid over-engineering on first pass.
- **Suggest alternatives.** When implementing something, briefly note if a simpler or more idiomatic approach exists.
- **Screenshot/image analysis.** When given a UI screenshot or reference design, generate matching frontend code AND call out structural improvements (accessibility, responsiveness, component reuse).
- **Self-contained prototypes.** Each prototype should be runnable in isolation with minimal setup. Prefer zero-config or near-zero-config starts (e.g., `npm run dev`, `python main.py`, `uvicorn app:app`).

## Project Structure

This repo is not yet settled on a monorepo vs. per-prototype layout. Until a structure is chosen:
- New prototypes go in their own top-level directory (e.g., `my-tool/`)
- Shared utilities, if they emerge, go in `shared/` or `lib/`
- Scripts and one-off helpers go in `scripts/`

## Tech Stack Defaults

Unless otherwise specified, default to:

**Frontend:** React + Next.js (TypeScript), Tailwind CSS
**Backend:** Python — FastAPI with `uvicorn` for APIs; plain scripts for automation
**AI integrations:** Support Claude (Anthropic), OpenAI, and Ollama (local models) — abstract provider behind a thin wrapper so it's easy to swap

## AI Integration Pattern

When building AI features, use a provider-agnostic wrapper:
- Claude: `anthropic` Python SDK or `@anthropic-ai/sdk` for Node
- OpenAI-compatible: `openai` Python SDK (also works for Ollama with `base_url` override)
- Keep model/provider config in environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OLLAMA_BASE_URL`)

## Shell Environment

**Tyler uses PowerShell on Windows.** Always give shell commands in PowerShell syntax, not bash:
- Use `Remove-Item -Recurse -Force` not `rm -rf`
- Use `$env:VAR = "value"` not `export VAR=value`
- Use backslashes or quoted forward slashes in paths where needed
- Use `;` not `&&` to chain commands (or use separate lines)

## Common Commands

These apply per-prototype depending on its stack:

**Next.js prototype:**
```powershell
npm install
npm run dev       # start dev server
npm run build     # production build
npm run lint      # ESLint
```

**Python/FastAPI prototype:**
```powershell
pip install -r requirements.txt   # or: uv sync
uvicorn app:app --reload           # start dev server
python main.py                     # for scripts
pytest                             # run tests
pytest tests/test_foo.py -k name   # run single test
```

**Clean reinstall (Next.js):**
```powershell
Remove-Item -Recurse -Force .next, node_modules
npm install
npm run dev
```

## New Prototype Checklist

Do these steps at the start of every new prototype, before writing application code:

1. Create `.gitignore` (exclude `node_modules/`, `.next/`, `__pycache__/`, `.venv/`, `backend/.env`)
2. `git init` and commit the `.gitignore` **first** — before staging anything else (prevents VS Code showing 10K+ changes from build artifacts)
3. Write `README.md` with: what it does, stack, setup instructions, environment variables, and usage
4. Create the GitHub repo and push (`gh repo create` or add remote + push)

## When Analyzing Screenshots or Existing Code

1. Identify the UI layout and component breakdown first.
2. Generate working code that matches the visual structure.
3. Immediately follow with a "Suggested improvements" note covering: component decomposition, state management, accessibility, or API design — whichever applies.
