"""MCP Explorer — FastAPI backend."""

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import mcp_routes

# Ensure tmp dir exists for custom server testing
(Path(__file__).parent / "tmp").mkdir(exist_ok=True)

app = FastAPI(title="MCP Explorer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3002", "http://127.0.0.1:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mcp_routes.router)


@app.get("/health")
def health():
    return {"status": "ok"}
