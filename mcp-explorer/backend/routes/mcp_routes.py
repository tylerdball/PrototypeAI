"""MCP Explorer API routes."""

import os
import sys
import importlib.util
import tempfile
import asyncio
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import mcp_runner
import code_generator

router = APIRouter(prefix="/mcp", tags=["mcp"])

SERVERS_DIR = Path(__file__).parent.parent / "servers"
TMP_DIR = Path(tempfile.gettempdir()) / "mcp-explorer"
TMP_DIR.mkdir(exist_ok=True)

EXAMPLE_SERVERS = {
    "calculator": {
        "name": "Calculator",
        "description": "Basic arithmetic — add, subtract, multiply, divide, power.",
        "icon": "🧮",
        "file": "calculator.py",
    },
    "text-analyzer": {
        "name": "Text Analyzer",
        "description": "Analyse text without an LLM — word count, reading time, top words.",
        "icon": "📝",
        "file": "text_analyzer.py",
    },
    "date-tools": {
        "name": "Date Tools",
        "description": "Date utilities — today, days between dates, add days, what day is a date.",
        "icon": "📅",
        "file": "date_tools.py",
    },
}


class CallRequest(BaseModel):
    server: str
    tool: str
    arguments: dict[str, Any] = {}


class GenerateRequest(BaseModel):
    server_name: str
    tools: list[dict[str, Any]]


class TestCustomRequest(BaseModel):
    code: str
    tool: str
    arguments: dict[str, Any] = {}


def _unwrap(e: Exception) -> str:
    """Extract the real error message from an anyio/asyncio ExceptionGroup."""
    if hasattr(e, "exceptions") and e.exceptions:
        return _unwrap(e.exceptions[0])
    return str(e)


@router.get("/servers")
def list_servers():
    return [{"id": k, **v} for k, v in EXAMPLE_SERVERS.items()]


@router.get("/servers/{server_id}/tools")
async def get_tools(server_id: str):
    if server_id not in EXAMPLE_SERVERS:
        raise HTTPException(status_code=404, detail=f"Server '{server_id}' not found.")
    server_file = SERVERS_DIR / EXAMPLE_SERVERS[server_id]["file"]
    try:
        tools = await asyncio.wait_for(mcp_runner.list_tools(str(server_file)), timeout=20)
        return {"server": server_id, "tools": tools}
    except asyncio.TimeoutError:
        raise HTTPException(status_code=500, detail="Server took too long to start.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=_unwrap(e))


@router.post("/call")
async def call_tool(req: CallRequest):
    if req.server not in EXAMPLE_SERVERS:
        raise HTTPException(status_code=404, detail=f"Server '{req.server}' not found.")
    server_file = SERVERS_DIR / EXAMPLE_SERVERS[req.server]["file"]
    try:
        result = await asyncio.wait_for(mcp_runner.call_tool(str(server_file), req.tool, req.arguments), timeout=20)
        return {"server": req.server, "tool": req.tool, "result": result}
    except asyncio.TimeoutError:
        raise HTTPException(status_code=500, detail="Tool call timed out.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=_unwrap(e))


@router.post("/generate")
def generate_code(req: GenerateRequest):
    code = code_generator.generate(req.server_name, req.tools)
    return {"code": code}


@router.post("/test-custom")
def test_custom(req: TestCustomRequest):
    """Load generated code as a module and call the tool function directly."""
    tmp = None
    mod_name = "_mcp_server_test"
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, dir=TMP_DIR, encoding="utf-8") as f:
            f.write(req.code)
            tmp = f.name

        spec = importlib.util.spec_from_file_location(mod_name, tmp)
        if spec is None or spec.loader is None:
            raise ValueError("Could not load generated code.")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)  # type: ignore[union-attr]

        fn = getattr(mod, req.tool, None)
        if fn is None:
            raise ValueError(f"Tool '{req.tool}' not found in generated code.")

        result = fn(**req.arguments)
        return {"tool": req.tool, "result": [{"type": "text", "text": str(result)}]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if mod_name in sys.modules:
            del sys.modules[mod_name]
        if tmp and os.path.exists(tmp):
            os.unlink(tmp)
