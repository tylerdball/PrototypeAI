'use client'

import { useState } from 'react'

const API = 'http://localhost:8006'

type FieldType = 'int' | 'float' | 'str' | 'bool' | 'date' | 'email' | 'phone' | 'uuid' | 'enum'
type ExportFormat = 'json' | 'csv'

interface Field {
  id: string
  name: string
  type: FieldType
  nullable: boolean
  constraints: Record<string, unknown>
}

interface GenerateResult {
  rows: Record<string, unknown>[]
  row_count: number
  schema_name: string
  export_format: string
  generated_at: string
}

function newField(id: string): Field {
  return { id, name: '', type: 'int', nullable: false, constraints: {} }
}

// Minimal JSON syntax highlighter (input is already HTML-escaped)
function highlightJson(raw: string): string {
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped.replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) return `<span class="text-sky-400">${match}</span>`
        return `<span class="text-emerald-400">${match}</span>`
      }
      if (/true|false/.test(match)) return `<span class="text-violet-400">${match}</span>`
      if (/null/.test(match)) return `<span class="text-rose-500">${match}</span>`
      return `<span class="text-amber-300">${match}</span>`
    }
  )
}

function ConstraintEditor({
  field,
  onChange,
}: {
  field: Field
  onChange: (c: Record<string, unknown>) => void
}) {
  const c = field.constraints
  const set = (key: string, val: unknown) => onChange({ ...c, [key]: val })

  switch (field.type) {
    case 'int':
    case 'float':
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          <input
            className="constraint-input w-20"
            placeholder="min"
            type="number"
            value={(c.min as string) ?? ''}
            onChange={(e) => set('min', e.target.value === '' ? undefined : Number(e.target.value))}
          />
          <input
            className="constraint-input w-20"
            placeholder="max"
            type="number"
            value={(c.max as string) ?? ''}
            onChange={(e) => set('max', e.target.value === '' ? undefined : Number(e.target.value))}
          />
          <select
            className="constraint-input"
            value={(c.distribution as string) ?? 'uniform'}
            onChange={(e) => set('distribution', e.target.value)}
          >
            <option value="uniform">uniform</option>
            <option value="normal">normal</option>
            <option value="exponential">exponential</option>
          </select>
        </div>
      )
    case 'enum':
      return (
        <div className="mt-2">
          <input
            className="constraint-input w-full"
            placeholder="values: red, green, blue"
            value={(c.values as string) ?? ''}
            onChange={(e) => set('values', e.target.value)}
          />
        </div>
      )
    case 'date':
      return (
        <div className="flex gap-2 mt-2">
          <input
            className="constraint-input w-36"
            type="date"
            value={(c.start as string) ?? ''}
            onChange={(e) => set('start', e.target.value)}
          />
          <input
            className="constraint-input w-36"
            type="date"
            value={(c.end as string) ?? ''}
            onChange={(e) => set('end', e.target.value)}
          />
        </div>
      )
    case 'bool':
      return (
        <div className="mt-2 flex items-center gap-3">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">true_prob</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={(c.true_probability as number) ?? 0.5}
            onChange={(e) => set('true_probability', Number(e.target.value))}
            className="w-28 accent-amber-500"
          />
          <span className="text-xs text-zinc-400 tabular-nums">
            {((c.true_probability as number) ?? 0.5).toFixed(2)}
          </span>
        </div>
      )
    case 'str':
      return (
        <div className="mt-2">
          <input
            className="constraint-input w-full"
            placeholder="prompt: Generate a job title"
            value={(c.prompt as string) ?? ''}
            onChange={(e) => set('prompt', e.target.value)}
          />
        </div>
      )
    default:
      return (
        <div className="mt-1.5 text-[10px] text-zinc-700 italic">no constraints</div>
      )
  }
}

export default function Page() {
  const [fields, setFields] = useState<Field[]>([
    { id: '1', name: 'id', type: 'uuid', nullable: false, constraints: {} },
    { id: '2', name: 'age', type: 'int', nullable: false, constraints: { min: 18, max: 80 } },
    { id: '3', name: 'email', type: 'email', nullable: false, constraints: {} },
  ])
  const [personaMode, setPersonaMode] = useState(false)
  const [rowCount, setRowCount] = useState(10)
  const [seed, setSeed] = useState('')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')
  const [schemaName, setSchemaName] = useState('dataset')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const addField = () => {
    setFields((f) => [...f, newField(String(Date.now()))])
  }

  const removeField = (id: string) => setFields((f) => f.filter((x) => x.id !== id))

  const updateField = (id: string, patch: Partial<Field>) =>
    setFields((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const loadSample = async () => {
    setError(null)
    try {
      const res = await fetch(`${API}/schema/sample`)
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      const schema = data.schema
      setSchemaName(schema.schema_name)
      setRowCount(schema.row_count)
      setPersonaMode(data.persona_mode ?? false)
      setExportFormat(data.export_format ?? 'json')
      setFields(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema.fields.map((f: any, i: number) => ({
          id: String(i),
          name: f.name,
          type: f.type,
          nullable: f.nullable ?? false,
          constraints: f.constraints ?? {},
        }))
      )
    } catch {
      setError('Could not reach backend — is it running on port 8006?')
    }
  }

  const buildPayload = () => ({
    schema: {
      schema_name: schemaName,
      row_count: rowCount,
      seed: seed ? Number(seed) : null,
      fields: personaMode
        ? []
        : fields
            .filter((f) => f.name.trim())
            .map((f) => {
              const constraints: Record<string, unknown> = { ...f.constraints }
              if (f.type === 'enum' && typeof constraints.values === 'string') {
                constraints.values = (constraints.values as string)
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              }
              return { name: f.name, type: f.type, nullable: f.nullable, constraints }
            }),
    },
    persona_mode: personaMode,
    export_format: exportFormat,
  })

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) {
        const text = await res.text()
        setError(`Error ${res.status}: ${text}`)
        return
      }
      setResult(await res.json())
    } catch {
      setError('Could not reach backend — is it running on port 8006?')
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!result) return
    const ext = result.export_format
    let content: string
    let mime: string
    if (ext === 'csv') {
      const rows = result.rows
      if (!rows.length) return
      const headers = Object.keys(rows[0])
      const csv = [
        headers.join(','),
        ...rows.map((r) =>
          headers
            .map((h) => {
              const v = String(r[h] ?? '')
              return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v
            })
            .join(',')
        ),
      ].join('\n')
      content = csv
      mime = 'text/csv'
    } else {
      content = JSON.stringify(result.rows, null, 2)
      mime = 'application/json'
    }
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.schema_name}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const displayRows = result ? result.rows.slice(0, 20) : []
  const jsonPreview = result ? JSON.stringify(displayRows, null, 2) : ''
  const tableHeaders = displayRows.length ? Object.keys(displayRows[0]) : []

  return (
    <div className="h-screen flex flex-col bg-[#07080c] overflow-hidden">
      {/* ── Header ── */}
      <header className="flex-none flex items-center gap-4 px-5 py-2.5 border-b border-[#1c2438]">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[11px] font-bold tracking-[0.25em] text-amber-500 uppercase">
            Synthetic Data Generator
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[10px] text-zinc-700">
          <span>api · localhost:8006</span>
          <span className="text-zinc-800">·</span>
          <span>v0.1.0</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left panel ── */}
        <aside className="w-[420px] flex-none flex flex-col border-r border-[#1c2438] overflow-y-auto">

          {/* Mode toggle */}
          <div className="px-4 pt-4 pb-3 border-b border-[#1c2438]">
            <div className="flex items-center gap-1 p-1 bg-[#0d0f15] rounded border border-[#1c2438]">
              {(['schema', 'persona'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPersonaMode(m === 'persona')}
                  className={`flex-1 py-1.5 text-[10px] tracking-[0.15em] uppercase transition-all rounded ${
                    personaMode === (m === 'persona')
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                      : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  {m === 'schema' ? 'Schema Builder' : 'Persona Mode'}
                </button>
              ))}
            </div>
          </div>

          {/* Schema name */}
          <div className="px-4 pt-3 pb-2">
            <label className="block text-[10px] tracking-widest text-zinc-600 uppercase mb-1.5">
              Schema Name
            </label>
            <input
              className="w-full bg-[#0d0f15] border border-[#1c2438] text-zinc-300 text-xs px-3 py-2 rounded focus:outline-none focus:border-amber-500/50 transition-colors"
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value)}
            />
          </div>

          {/* Fields or persona description */}
          {personaMode ? (
            <div className="px-4 pt-2 pb-3">
              <div className="bg-[#0d0f15] border border-amber-500/15 rounded p-4">
                <p className="text-[11px] text-amber-400/80 font-semibold mb-2 tracking-wider">
                  PERSONA MODE ACTIVE
                </p>
                <p className="text-[11px] text-zinc-600 mb-3 leading-relaxed">
                  Generates richly-correlated synthetic user profiles. Each row includes:
                </p>
                <div className="space-y-0.5 text-[11px]">
                  <p className="text-zinc-500">id · first_name · last_name · full_name</p>
                  <p className="text-zinc-500">age · email · phone</p>
                  <p className="text-zinc-500">city · state · country · zip_code</p>
                  <p className="text-zinc-500">signup_date · is_active · lifetime_value · preferred_channel</p>
                  <p className="text-emerald-600/80 mt-2">avg_session_duration_mins · sessions_per_week</p>
                  <p className="text-emerald-600/80">pages_per_session · conversion_rate · last_active_days_ago</p>
                </div>
                <p className="text-[10px] text-zinc-700 mt-3 italic">
                  Behaviour fields are statistically correlated to lifetime_value and age.
                </p>
              </div>
            </div>
          ) : (
            <div className="px-4 pt-2 pb-3 flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] tracking-widest text-zinc-600 uppercase">Fields</label>
                <span className="text-[10px] text-zinc-700">{fields.length}</span>
              </div>
              <div className="space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="bg-[#0d0f15] border border-[#1c2438] rounded p-3 group"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        className="flex-1 min-w-0 bg-transparent border-b border-[#1c2438] text-zinc-300 text-xs px-1 py-0.5 focus:outline-none focus:border-amber-500/50 placeholder-zinc-700 transition-colors"
                        placeholder="field_name"
                        value={field.name}
                        onChange={(e) => updateField(field.id, { name: e.target.value })}
                      />
                      <select
                        className="bg-[#07080c] border border-[#1c2438] text-zinc-400 text-xs px-2 py-0.5 rounded focus:outline-none focus:border-amber-500/40"
                        value={field.type}
                        onChange={(e) =>
                          updateField(field.id, {
                            type: e.target.value as FieldType,
                            constraints: {},
                          })
                        }
                      >
                        {(
                          ['int', 'float', 'str', 'bool', 'date', 'email', 'phone', 'uuid', 'enum'] as FieldType[]
                        ).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-[10px] text-zinc-600 cursor-pointer select-none whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={field.nullable}
                          onChange={(e) => updateField(field.id, { nullable: e.target.checked })}
                          className="accent-amber-500 w-3 h-3"
                        />
                        null
                      </label>
                      <button
                        className="text-zinc-700 hover:text-rose-500 transition-colors text-base leading-none opacity-0 group-hover:opacity-100 ml-1"
                        onClick={() => removeField(field.id)}
                        title="Remove field"
                      >
                        ×
                      </button>
                    </div>
                    <ConstraintEditor
                      field={field}
                      onChange={(c) => updateField(field.id, { constraints: c })}
                    />
                  </div>
                ))}
              </div>
              <button
                className="mt-2 w-full py-2 border border-dashed border-[#1c2438] hover:border-amber-500/25 text-zinc-700 hover:text-amber-500/60 text-xs transition-all rounded"
                onClick={addField}
              >
                + add field
              </button>
            </div>
          )}

          {/* Config: rows + seed + format */}
          <div className="px-4 py-3 space-y-3 border-t border-[#1c2438]">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] tracking-widest text-zinc-600 uppercase mb-1.5">
                  Rows
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  className="w-full bg-[#0d0f15] border border-[#1c2438] text-zinc-300 text-xs px-3 py-2 rounded focus:outline-none focus:border-amber-500/50 transition-colors"
                  value={rowCount}
                  onChange={(e) => setRowCount(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] tracking-widest text-zinc-600 uppercase mb-1.5">
                  Seed <span className="text-zinc-800 normal-case">(optional)</span>
                </label>
                <input
                  type="number"
                  className="w-full bg-[#0d0f15] border border-[#1c2438] text-zinc-300 text-xs px-3 py-2 rounded focus:outline-none focus:border-amber-500/50 transition-colors placeholder-zinc-800"
                  placeholder="random"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] tracking-widest text-zinc-600 uppercase mb-1.5">
                Export Format
              </label>
              <div className="flex gap-1">
                {(['json', 'csv'] as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={`flex-1 py-1.5 text-xs tracking-widest uppercase rounded transition-all ${
                      exportFormat === fmt
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                        : 'bg-[#0d0f15] border border-[#1c2438] text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 flex gap-2">
            <button
              className="px-3 py-2 text-xs text-zinc-600 hover:text-zinc-400 border border-[#1c2438] hover:border-zinc-600 rounded transition-all whitespace-nowrap"
              onClick={loadSample}
            >
              load sample
            </button>
            <button
              className="flex-1 py-2 text-xs tracking-widest uppercase font-bold rounded transition-all bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={generate}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  generating…
                </span>
              ) : (
                'generate'
              )}
            </button>
          </div>
        </aside>

        {/* ── Right panel: Results ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {error && (
            <div className="m-4 p-3 bg-rose-500/10 border border-rose-500/25 rounded text-xs text-rose-400">
              {error}
            </div>
          )}

          {!result && !error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 select-none">
              <div className="text-5xl text-zinc-800">◈</div>
              <p className="text-[11px] tracking-widest text-zinc-700 uppercase">
                configure schema · press generate
              </p>
            </div>
          )}

          {result && (
            <>
              {/* Results toolbar */}
              <div className="flex-none flex items-center gap-3 px-5 py-2.5 border-b border-[#1c2438]">
                <span className="text-xs text-zinc-500">
                  <span className="text-emerald-400 font-bold tabular-nums">{result.row_count}</span>
                  {' rows · '}
                  <span className="text-zinc-600">{result.schema_name}</span>
                  {' · '}
                  <span className="text-zinc-600">{result.export_format}</span>
                </span>
                {result.rows.length > 20 && (
                  <span className="text-[10px] text-zinc-700 bg-[#0d0f15] border border-[#1c2438] px-2 py-0.5 rounded">
                    showing first 20
                  </span>
                )}
                <button
                  className="ml-auto text-[11px] px-3 py-1.5 border border-[#1c2438] hover:border-amber-500/30 text-zinc-600 hover:text-amber-400 rounded transition-all"
                  onClick={download}
                >
                  ↓ {result.schema_name}.{result.export_format}
                </button>
              </div>

              {/* Results body */}
              <div className="flex-1 overflow-auto">
                {exportFormat === 'csv' ? (
                  <table className="text-xs border-collapse w-full">
                    <thead className="sticky top-0 bg-[#07080c] z-10">
                      <tr className="border-b border-[#1c2438]">
                        {tableHeaders.map((h) => (
                          <th
                            key={h}
                            className="text-left py-2 px-4 text-[10px] tracking-widest uppercase text-zinc-600 whitespace-nowrap font-normal"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((row, i) => (
                        <tr
                          key={i}
                          className={`border-b border-[#0d0f15] hover:bg-[#0d0f15] transition-colors ${
                            i % 2 === 1 ? 'bg-[#090a0e]' : ''
                          }`}
                        >
                          {tableHeaders.map((h, j) => (
                            <td
                              key={j}
                              className="py-1.5 px-4 text-zinc-400 whitespace-nowrap max-w-[220px] truncate"
                              title={String(row[h] ?? '')}
                            >
                              {String(row[h] ?? (
                                <span className="text-rose-500/60 italic">null</span>
                              ))}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <pre
                    className="p-5 text-xs leading-relaxed text-zinc-500"
                    dangerouslySetInnerHTML={{ __html: highlightJson(jsonPreview) }}
                  />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
