"use client";

import { useState, useEffect } from "react";

const API = "/api/backend";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MCPServer { id: string; name: string; description: string; icon: string; }
interface MCPTool { name: string; description: string; inputSchema: any; }
interface ToolParam { name: string; type: string; description: string; required: boolean; }
interface BuildTool { id: string; name: string; description: string; parameters: ToolParam[]; return_type: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 8); }

function schemaToParams(schema: any): ToolParam[] {
  if (!schema?.properties) return [];
  const required: string[] = schema.required || [];
  return Object.entries(schema.properties).map(([name, def]: [string, any]) => ({
    name,
    type: def.type || "string",
    description: def.description || "",
    required: required.includes(name),
  }));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function JsonInput({ schema, value, onChange }: { schema: any; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const params = schemaToParams(schema);
  if (!params.length) return <p className="text-xs text-[var(--muted)]">No inputs required.</p>;
  return (
    <div className="space-y-2">
      {params.map((p) => (
        <div key={p.name}>
          <label className="text-xs text-[var(--muted)] block mb-0.5">
            {p.name} <span className="text-[var(--muted)]/60">({p.type})</span>
            {p.required && <span className="text-red-400 ml-1">*</span>}
            {p.description && <span className="ml-1 text-[var(--muted)]/60">— {p.description}</span>}
          </label>
          <input
            value={value[p.name] ?? ""}
            onChange={(e) => onChange({ ...value, [p.name]: e.target.value })}
            placeholder={p.type === "number" || p.type === "integer" ? "0" : `"${p.name}"`}
            className="w-full rounded border border-[var(--border)] bg-black/30 px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-brand-500"
          />
        </div>
      ))}
    </div>
  );
}

function ResultBlock({ result }: { result: any[] }) {
  return (
    <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 p-3 space-y-1">
      {result.map((block, i) => (
        <pre key={i} className="text-xs text-brand-300 whitespace-pre-wrap">{block.text ?? JSON.stringify(block)}</pre>
      ))}
    </div>
  );
}

// ── Learn tab ────────────────────────────────────────────────────────────────

function LearnTab() {
  const CONCEPTS = [
    { icon: "🔧", name: "Tools", color: "border-blue-500/30 bg-blue-900/10", accent: "text-blue-300",
      def: "Functions an LLM can call. Each tool has a name, description, and JSON Schema for its inputs. The LLM decides when to call a tool based on the user's request." },
    { icon: "📄", name: "Resources", color: "border-purple-500/30 bg-purple-900/10", accent: "text-purple-300",
      def: "Data the LLM can read — files, database records, API responses. Unlike tools, resources are passive: the LLM reads them, doesn't execute them." },
    { icon: "💬", name: "Prompts", color: "border-yellow-500/30 bg-yellow-900/10", accent: "text-yellow-300",
      def: "Reusable prompt templates defined by the server. Clients can list and invoke them, letting servers ship curated prompts alongside their tools." },
    { icon: "🚌", name: "Transport", color: "border-green-500/30 bg-green-900/10", accent: "text-green-300",
      def: "How client and server communicate. stdio (subprocess via stdin/stdout) for local tools. SSE over HTTP for remote servers. Same protocol, different wire." },
  ];

  const FLOW = [
    { label: "User", sub: "sends a message" },
    { label: "LLM", sub: "decides to call a tool" },
    { label: "MCP Client", sub: "sends tools/call request" },
    { label: "MCP Server", sub: "executes the tool" },
    { label: "Result", sub: "returned to LLM context" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-semibold text-white mb-1">What is MCP?</h2>
        <p className="text-sm text-[var(--muted)] leading-relaxed max-w-3xl">
          Model Context Protocol (MCP) is an open standard for connecting LLMs to external tools, data, and systems.
          Instead of hardcoding tool logic into your app, you write an <span className="text-white">MCP server</span> that exposes tools —
          and any MCP client (Claude Desktop, Claude Code, custom apps) can discover and use them automatically.
          Think of it as a <span className="text-white">USB standard for AI tools</span>: write once, plug in anywhere.
        </p>
      </div>

      {/* Flow diagram */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">How a tool call flows</h2>
        <div className="flex items-center gap-0 flex-wrap">
          {FLOW.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center min-w-[100px]">
                <p className="text-sm font-semibold text-white">{step.label}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{step.sub}</p>
              </div>
              {i < FLOW.length - 1 && (
                <div className="text-brand-500 px-1 text-lg">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Concept cards */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Core concepts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONCEPTS.map((c) => (
            <div key={c.name} className={`rounded-lg border p-4 ${c.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{c.icon}</span>
                <span className={`font-semibold text-sm ${c.accent}`}>{c.name}</span>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">{c.def}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FastMCP snippet */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Simplest possible MCP server</h2>
        <div className="rounded-xl border border-[var(--border)] bg-black/40 overflow-hidden">
          <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-xs text-[var(--muted)]">Python · FastMCP</span>
            <span className="text-xs text-brand-500">3 lines to a working tool</span>
          </div>
          <pre className="p-4 text-sm text-green-300 overflow-x-auto leading-relaxed">{`from mcp.server.fastmcp import FastMCP

mcp = FastMCP("my-server")

@mcp.tool()
def greet(name: str) -> str:
    """Say hello to someone."""
    return f"Hello, {name}!"

if __name__ == "__main__":
    mcp.run()`}</pre>
        </div>
        <p className="text-xs text-[var(--muted)] mt-2">
          FastMCP infers the tool name, description, and JSON Schema automatically from the function signature and docstring.
          Go to the <span className="text-white">Build</span> tab to generate and test your own.
        </p>
      </div>

      {/* When to build an MCP server */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { title: "Build an MCP server when…", items: ["You want Claude/AI to access a private API or database", "You're building a repeatable tool multiple AI apps should share", "You want to add AI to an existing service without changing it", "You want tools to be testable and versioned independently"] },
          { title: "Don't need MCP when…", items: ["You're hardcoding one-off tool calls in a single app", "Your tool has no parameters and just reads a static value", "You control both the LLM call and the tool — just call it directly", "Latency of spawning a subprocess is unacceptable"] },
        ].map(({ title, items }) => (
          <div key={title} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="text-xs font-semibold text-white mb-2">{title}</h3>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item} className="text-xs text-[var(--muted)] flex items-start gap-1.5">
                  <span className="text-brand-500 mt-0.5 shrink-0">•</span>{item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Examples tab ──────────────────────────────────────────────────────────────

function ExamplesTab() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/mcp/servers`).then((r) => r.json()).then(setServers).catch(() => {});
  }, []);

  async function loadTools(serverId: string) {
    setToolsLoading(true);
    setTools([]);
    setSelectedTool(null);
    setResult(null);
    setError("");
    try {
      const res = await fetch(`${API}/mcp/servers/${serverId}/tools`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTools(data.tools);
      if (data.tools.length) setSelectedTool(data.tools[0]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setToolsLoading(false);
    }
  }

  function selectServer(id: string) {
    setSelectedServer(id);
    loadTools(id);
  }

  function coerceInputs(tool: MCPTool, raw: Record<string, string>): Record<string, any> {
    const schema = tool.inputSchema;
    const props = schema?.properties || {};
    const out: Record<string, any> = {};
    for (const [key, def] of Object.entries(props) as [string, any][]) {
      const val = raw[key] ?? "";
      if (def.type === "number" || def.type === "integer") {
        out[key] = val === "" ? 0 : Number(val);
      } else if (def.type === "boolean") {
        out[key] = val === "true";
      } else {
        out[key] = val;
      }
    }
    return out;
  }

  async function runTool() {
    if (!selectedServer || !selectedTool) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const args = coerceInputs(selectedTool, inputs);
      const res = await fetch(`${API}/mcp/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server: selectedServer, tool: selectedTool.name, arguments: args }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || res.statusText);
      }
      const data = await res.json();
      setResult(data.result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Server list */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-white mb-3">Example Servers</h2>
        {servers.map((s) => (
          <button
            key={s.id}
            onClick={() => selectServer(s.id)}
            className={`w-full rounded-lg border p-3 text-left transition-colors ${
              selectedServer === s.id ? "border-brand-500/50 bg-brand-500/10" : "border-[var(--border)] bg-[var(--surface)] hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{s.icon}</span>
              <span className="text-sm font-medium text-white">{s.name}</span>
            </div>
            <p className="text-xs text-[var(--muted)]">{s.description}</p>
          </button>
        ))}
        {!servers.length && <p className="text-xs text-[var(--muted)]">Loading servers…</p>}
      </div>

      {/* Tool explorer */}
      <div className="lg:col-span-3 space-y-4">
        {!selectedServer ? (
          <div className="flex items-center justify-center h-48 rounded-xl border border-[var(--border)] text-[var(--muted)] text-sm">
            Select a server to explore its tools
          </div>
        ) : toolsLoading ? (
          <div className="flex items-center justify-center h-48 rounded-xl border border-[var(--border)] text-[var(--muted)] text-sm animate-pulse">
            Loading tools…
          </div>
        ) : (
          <>
            {/* Tool tabs */}
            <div className="flex gap-2 flex-wrap">
              {tools.map((t) => (
                <button
                  key={t.name}
                  onClick={() => { setSelectedTool(t); setInputs({}); setResult(null); setError(""); }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    selectedTool?.name === t.name ? "border-brand-500 bg-brand-500/20 text-brand-400" : "border-[var(--border)] text-[var(--muted)] hover:text-white"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {selectedTool && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <p className="text-sm font-semibold text-white">{selectedTool.name}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{selectedTool.description}</p>
                </div>

                <div className="p-4 space-y-4">
                  {/* Schema */}
                  <div>
                    <p className="text-xs text-[var(--muted)] font-medium mb-2">Input Schema</p>
                    <pre className="text-xs text-blue-300 bg-black/30 rounded-lg p-3 overflow-x-auto">
                      {JSON.stringify(selectedTool.inputSchema, null, 2)}
                    </pre>
                  </div>

                  {/* Inputs */}
                  <div>
                    <p className="text-xs text-[var(--muted)] font-medium mb-2">Test Arguments</p>
                    <JsonInput schema={selectedTool.inputSchema} value={inputs} onChange={setInputs} />
                  </div>

                  {error && <p className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</p>}

                  <button
                    onClick={runTool}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Calling tool…" : "Call Tool →"}
                  </button>

                  {result && (
                    <div>
                      <p className="text-xs text-[var(--muted)] font-medium mb-2">Result</p>
                      <ResultBlock result={result} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Build tab ─────────────────────────────────────────────────────────────────

const PARAM_TYPES = ["string", "number", "integer", "boolean"];

function BuildTab() {
  const [serverName, setServerName] = useState("my-server");
  const [tools, setTools] = useState<BuildTool[]>([{
    id: uid(), name: "greet", description: "Say hello to someone by name.",
    parameters: [{ name: "name", type: "string", description: "The person's name", required: true }],
    return_type: "string",
  }]);
  const [generatedCode, setGeneratedCode] = useState("");
  const [testTool, setTestTool] = useState("");
  const [testInputs, setTestInputs] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function addTool() {
    setTools((ts) => [...ts, { id: uid(), name: "new_tool", description: "", parameters: [], return_type: "string" }]);
  }

  function removeTool(id: string) {
    setTools((ts) => ts.filter((t) => t.id !== id));
  }

  function updateTool(id: string, patch: Partial<BuildTool>) {
    setTools((ts) => ts.map((t) => t.id === id ? { ...t, ...patch } : t));
  }

  function addParam(toolId: string) {
    updateTool(toolId, {
      parameters: [...(tools.find((t) => t.id === toolId)?.parameters ?? []),
        { name: "param", type: "string", description: "", required: false }],
    });
  }

  function updateParam(toolId: string, idx: number, patch: Partial<ToolParam>) {
    const tool = tools.find((t) => t.id === toolId)!;
    const params = tool.parameters.map((p, i) => i === idx ? { ...p, ...patch } : p);
    updateTool(toolId, { parameters: params });
  }

  function removeParam(toolId: string, idx: number) {
    const tool = tools.find((t) => t.id === toolId)!;
    updateTool(toolId, { parameters: tool.parameters.filter((_, i) => i !== idx) });
  }

  async function generate() {
    setError("");
    try {
      const res = await fetch(`${API}/mcp/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server_name: serverName, tools }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setGeneratedCode(data.code);
      setTestTool(tools[0]?.name || "");
    } catch (e: any) {
      setError(e.message);
    }
  }

  function buildSchema(tool: BuildTool): any {
    const props: any = {};
    const required: string[] = [];
    for (const p of tool.parameters) {
      props[p.name] = { type: p.type, description: p.description };
      if (p.required) required.push(p.name);
    }
    return { type: "object", properties: props, required };
  }

  async function testGenerated() {
    if (!generatedCode || !testTool) return;
    setLoading(true);
    setTestResult(null);
    setError("");
    const tool = tools.find((t) => t.name === testTool);
    const schema = tool ? buildSchema(tool) : {};
    try {
      const args: Record<string, any> = {};
      for (const [k, v] of Object.entries(testInputs)) {
        const param = tool?.parameters.find((p) => p.name === k);
        if (param?.type === "number" || param?.type === "integer") args[k] = Number(v);
        else if (param?.type === "boolean") args[k] = v === "true";
        else args[k] = v;
      }
      const res = await fetch(`${API}/mcp/test-custom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: generatedCode, tool: testTool, arguments: args }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || res.statusText);
      }
      const data = await res.json();
      setTestResult(data.result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const selectedTool = tools.find((t) => t.name === testTool);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: tool builder */}
      <div className="space-y-4">
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Server name</label>
          <input
            value={serverName}
            onChange={(e) => setServerName(e.target.value.replace(/\s+/g, "-").toLowerCase())}
            className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="space-y-3">
          {tools.map((tool, ti) => (
            <div key={tool.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-400">Tool {ti + 1}</span>
                {tools.length > 1 && (
                  <button onClick={() => removeTool(tool.id)} className="text-xs text-[var(--muted)] hover:text-red-400">remove</button>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[var(--muted)] block mb-1">Name</label>
                    <input
                      value={tool.name}
                      onChange={(e) => updateTool(tool.id, { name: e.target.value.replace(/\s+/g, "_").toLowerCase() })}
                      className="w-full rounded border border-[var(--border)] bg-black/30 px-2 py-1 text-sm text-white font-mono focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted)] block mb-1">Returns</label>
                    <select
                      value={tool.return_type}
                      onChange={(e) => updateTool(tool.id, { return_type: e.target.value })}
                      className="w-full rounded border border-[var(--border)] bg-black/30 px-2 py-1 text-sm text-white focus:outline-none"
                    >
                      {PARAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      <option value="dict">dict</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] block mb-1">Description (becomes docstring)</label>
                  <input
                    value={tool.description}
                    onChange={(e) => updateTool(tool.id, { description: e.target.value })}
                    placeholder="What does this tool do?"
                    className="w-full rounded border border-[var(--border)] bg-black/30 px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Parameters */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-[var(--muted)]">Parameters</label>
                    <button onClick={() => addParam(tool.id)} className="text-xs text-brand-500 hover:text-brand-400">+ add</button>
                  </div>
                  <div className="space-y-1.5">
                    {tool.parameters.map((p, pi) => (
                      <div key={pi} className="grid grid-cols-12 gap-1 items-center">
                        <input value={p.name} onChange={(e) => updateParam(tool.id, pi, { name: e.target.value })}
                          placeholder="name" className="col-span-3 rounded border border-[var(--border)] bg-black/30 px-2 py-1 text-xs text-white font-mono focus:outline-none" />
                        <select value={p.type} onChange={(e) => updateParam(tool.id, pi, { type: e.target.value })}
                          className="col-span-2 rounded border border-[var(--border)] bg-black/30 px-1 py-1 text-xs text-white focus:outline-none">
                          {PARAM_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                        <input value={p.description} onChange={(e) => updateParam(tool.id, pi, { description: e.target.value })}
                          placeholder="description" className="col-span-5 rounded border border-[var(--border)] bg-black/30 px-2 py-1 text-xs text-white focus:outline-none" />
                        <label className="col-span-1 flex items-center justify-center">
                          <input type="checkbox" checked={p.required} onChange={(e) => updateParam(tool.id, pi, { required: e.target.checked })} className="accent-brand-500" />
                        </label>
                        <button onClick={() => removeParam(tool.id, pi)} className="col-span-1 text-xs text-[var(--muted)] hover:text-red-400 text-center">×</button>
                      </div>
                    ))}
                    {tool.parameters.length > 0 && (
                      <div className="grid grid-cols-12 gap-1 text-xs text-[var(--muted)]/60 px-0.5">
                        <span className="col-span-3">name</span><span className="col-span-2">type</span>
                        <span className="col-span-5">description</span><span className="col-span-1 text-center">req</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={addTool} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-white transition-colors">
            + Add Tool
          </button>
          <button onClick={generate} className="px-4 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
            Generate Server →
          </button>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</p>}
      </div>

      {/* Right: generated code + test */}
      <div className="space-y-4">
        {!generatedCode ? (
          <div className="flex items-center justify-center h-64 rounded-xl border border-[var(--border)] text-[var(--muted)] text-sm">
            Define your tools and click Generate Server →
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
                <span className="text-xs text-[var(--muted)]">Python · FastMCP · {serverName}.py</span>
                <button onClick={copyCode} className="text-xs text-brand-500 hover:text-brand-400 transition-colors">
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="p-4 text-xs text-green-300 overflow-x-auto max-h-72 leading-relaxed">{generatedCode}</pre>
            </div>

            {/* Test panel */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <p className="text-sm font-semibold text-white">Test your server</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">Saves code to a temp file and runs a real MCP call against it</p>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-[var(--muted)] block mb-1">Tool to test</label>
                  <select
                    value={testTool}
                    onChange={(e) => { setTestTool(e.target.value); setTestInputs({}); setTestResult(null); }}
                    className="w-full rounded border border-[var(--border)] bg-black/30 px-2 py-1.5 text-sm text-white focus:outline-none"
                  >
                    {tools.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>

                {selectedTool && selectedTool.parameters.length > 0 && (
                  <JsonInput
                    schema={buildSchema(selectedTool)}
                    value={testInputs}
                    onChange={setTestInputs}
                  />
                )}

                <button
                  onClick={testGenerated}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Running…" : "Run Tool Call →"}
                </button>

                {testResult && (
                  <div>
                    <p className="text-xs text-[var(--muted)] font-medium mb-2">Result</p>
                    <ResultBlock result={testResult} />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "learn" | "examples" | "build";

export default function Page() {
  const [tab, setTab] = useState<Tab>("learn");

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "learn", label: "Learn", icon: "📖" },
    { id: "examples", label: "Examples", icon: "🔌" },
    { id: "build", label: "Build", icon: "🔧" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg border border-[var(--border)] p-1 bg-[var(--surface)] w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === t.id ? "bg-brand-500 text-white" : "text-[var(--muted)] hover:text-white"
            }`}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tab === "learn" && <LearnTab />}
      {tab === "examples" && <ExamplesTab />}
      {tab === "build" && <BuildTab />}
    </div>
  );
}
