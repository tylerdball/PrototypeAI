"""Utilities to spawn and communicate with MCP servers via stdio transport."""

import os
import sys
import asyncio
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


def _params(server_path: str) -> StdioServerParameters:
    """Build StdioServerParameters, passing the full current environment so the
    spawned subprocess can find mcp and any other installed packages."""
    return StdioServerParameters(
        command=sys.executable,
        args=[server_path],
        env=os.environ.copy(),
    )


async def list_tools(server_path: str) -> list[dict]:
    """Return the tool list from an MCP server."""
    async with stdio_client(_params(server_path)) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.list_tools()
            return [
                {
                    "name": t.name,
                    "description": t.description or "",
                    "inputSchema": t.inputSchema,
                }
                for t in result.tools
            ]


async def call_tool(server_path: str, tool_name: str, arguments: dict[str, Any]) -> Any:
    """Call a named tool on an MCP server and return the result content."""
    async with stdio_client(_params(server_path)) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(tool_name, arguments)
            output = []
            for block in result.content:
                if hasattr(block, "text"):
                    output.append({"type": "text", "text": block.text})
                else:
                    output.append({"type": str(type(block).__name__), "data": str(block)})
            return output
