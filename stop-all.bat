@echo off
echo Stopping all PrototypeAI processes...

taskkill /FI "WINDOWTITLE eq AI Dashboard - Backend" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq AI Dashboard - Frontend" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Prioritization - Backend" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Prioritization - Frontend" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq MCP Explorer - Backend" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq MCP Explorer - Frontend" /T /F >nul 2>&1

echo Done. All prototype windows closed.
pause
