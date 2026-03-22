@echo off
echo Starting all PrototypeAI backends and frontends...
echo.

echo [1/6] AI Learning Dashboard - Backend (port 8000)
start "AI Dashboard - Backend" cmd /k "cd /d %~dp0ai-learning-dashboard\backend && uvicorn main:app --reload --port 8000"

echo [2/6] AI Learning Dashboard - Frontend (port 3000)
start "AI Dashboard - Frontend" cmd /k "cd /d %~dp0ai-learning-dashboard\frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo [3/6] AI Prioritization Tool - Backend (port 8001)
start "Prioritization - Backend" cmd /k "cd /d %~dp0ai-prioritization-tool\backend && uvicorn main:app --reload --port 8001"

echo [4/6] AI Prioritization Tool - Frontend (port 3001)
start "Prioritization - Frontend" cmd /k "cd /d %~dp0ai-prioritization-tool\frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo [5/6] MCP Explorer - Backend (port 8002)
start "MCP Explorer - Backend" cmd /k "cd /d %~dp0mcp-explorer\backend && uvicorn main:app --reload --port 8002"

echo [6/6] MCP Explorer - Frontend (port 3002)
start "MCP Explorer - Frontend" cmd /k "cd /d %~dp0mcp-explorer\frontend && npm run dev"

echo.
echo All 6 processes started in separate windows.
echo.
echo  AI Learning Dashboard    http://localhost:3000
echo  AI Prioritization Tool   http://localhost:3001
echo  MCP Explorer             http://localhost:3002
echo.
echo Opening landing page...
timeout /t 4 /nobreak >nul
start "" "%~dp0index.html"
