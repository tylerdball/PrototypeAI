'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Heuristic { id: number; name: string; description: string }

interface HeuristicScore {
  id: number; name: string; score: number
  severity: 'ok' | 'warning' | 'critical'
  findings: string[]; suggestions: string[]
}

interface HeuristicDelta {
  id: number; name: string
  before_score: number; after_score: number; delta: number
  change_summary: string
}

interface SingleReviewResponse {
  heuristics: HeuristicScore[]; overall_score: number
  summary: string; generated_at: string
}

interface CompareReviewResponse {
  before: SingleReviewResponse; after: SingleReviewResponse
  deltas: HeuristicDelta[]; overall_delta: number
  improvements: string[]; regressions: string[]
  summary: string; generated_at: string
}

interface HistoryEntry {
  id: string
  type: 'single' | 'compare'
  title: string
  overall_score?: number
  overall_delta?: number
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Semantic colors — work on both light and dark themes
function severityColor(s: 'ok' | 'warning' | 'critical') {
  return s === 'ok' ? '#22c55e' : s === 'warning' ? '#f59e0b' : '#ef4444'
}
function scoreColor(score: number) {
  return score >= 7.5 ? '#22c55e' : score >= 4 ? '#f59e0b' : '#ef4444'
}
function deltaColor(delta: number) {
  return delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : 'var(--text-muted)'
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full"
      style={{ backgroundColor: 'var(--bg-border)' }}>
      <div
        className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, (score / 10) * 100)}%`, backgroundColor: color }}
      />
    </div>
  )
}

function OverallBadge({ score, label }: { score: number; label?: string }) {
  const color = scoreColor(score)
  return (
    <div
      className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border text-center"
      style={{ borderColor: color + '40', backgroundColor: color + '12' }}
    >
      <span className="font-mono text-xl font-bold leading-none" style={{ color }}>
        {score.toFixed(1)}
      </span>
      {label && (
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      )}
    </div>
  )
}

function UploadZone({ file, onFile, label }: { file: File | null; onFile: (f: File) => void; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) onFile(f)
  }, [onFile])

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="label-sm">{label}</span>}
      <div
        className="relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-all duration-150"
        style={{
          borderColor: dragging ? 'var(--accent)' : 'var(--bg-border)',
          background: dragging ? 'var(--accent-dim)' : 'var(--bg-elevated)',
          minHeight: preview ? 'auto' : '100px',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="max-h-[200px] w-full object-contain" />
            <div className="flex items-center justify-between border-t px-3 py-1.5"
              style={{ borderColor: 'var(--bg-border)' }}>
              <span className="max-w-[160px] truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                {file?.name}
              </span>
              <button
                className="text-xs transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                onClick={(e) => { e.stopPropagation(); onFile(null as unknown as File) }}
              >
                remove
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
            <svg className="h-8 w-8" style={{ color: 'var(--bg-border-alt)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {dragging ? (
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Drop screenshot here</span>
              ) : (
                <><span style={{ color: 'var(--accent)' }}>Click to browse</span> or drag &amp; drop</>
              )}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>PNG, JPG, WEBP supported</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      </div>
    </div>
  )
}

function HeuristicCard({ h }: { h: HeuristicScore }) {
  const color = severityColor(h.severity)
  return (
    <div className={`card-base severity-${h.severity} flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            H{h.id}
          </p>
          <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {h.name}
          </p>
        </div>
        <span className="font-mono text-lg font-bold leading-none" style={{ color }}>{h.score.toFixed(1)}</span>
      </div>
      <ScoreBar score={h.score} color={color} />
      {h.findings.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Findings</p>
          <ul className="flex flex-col gap-1">
            {h.findings.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      {h.suggestions.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Suggestions</p>
          <ul className="flex flex-col gap-1">
            {h.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: 'var(--bg-border-alt)' }} />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function CompareRow({ d }: { d: HeuristicDelta }) {
  const dc = deltaColor(d.delta)
  const beforeColor = scoreColor(d.before_score)
  const afterColor = scoreColor(d.after_score)
  return (
    <div className="grid grid-cols-[1fr_140px_140px_80px] items-center gap-3 rounded-md border px-4 py-3"
      style={{ borderColor: 'var(--bg-border)', backgroundColor: 'var(--bg-elevated)' }}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>H{d.id}</p>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
        {d.change_summary && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{d.change_summary}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Before</span>
          <span className="font-mono text-xs" style={{ color: beforeColor }}>{d.before_score.toFixed(1)}</span>
        </div>
        <ScoreBar score={d.before_score} color={beforeColor} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>After</span>
          <span className="font-mono text-xs" style={{ color: afterColor }}>{d.after_score.toFixed(1)}</span>
        </div>
        <ScoreBar score={d.after_score} color={afterColor} />
      </div>
      <div className="flex flex-col items-center justify-center">
        <span className="font-mono text-base font-bold" style={{ color: dc }}>
          {d.delta > 0 ? '▲' : d.delta < 0 ? '▼' : '—'}{Math.abs(d.delta).toFixed(1)}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>delta</span>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin-slow h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle className="opacity-20" cx="12" cy="12" r="10" strokeWidth="3" />
      <path className="opacity-80" strokeLinecap="round" strokeWidth="3" d="M12 2a10 10 0 0110 10" />
    </svg>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_HEURISTICS: Heuristic[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1, name: `Heuristic ${i + 1}`, description: '',
}))

export default function Page() {
  // ── Theme ──
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('ux-theme')
    const dark = saved !== 'light'
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('ux-theme', next ? 'dark' : 'light')
  }

  // ── Inputs ──
  const [mode, setMode] = useState<'single' | 'compare'>('single')
  const [singleImage, setSingleImage] = useState<File | null>(null)
  const [beforeImage, setBeforeImage] = useState<File | null>(null)
  const [afterImage, setAfterImage] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [context, setContext] = useState('')
  const [focusAreas, setFocusAreas] = useState<number[]>([1,2,3,4,5,6,7,8,9,10])
  const [focusExpanded, setFocusExpanded] = useState(false)

  // ── Async state ──
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SingleReviewResponse | null>(null)
  const [compareResult, setCompareResult] = useState<CompareReviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Heuristics ──
  const [heuristics, setHeuristics] = useState<Heuristic[]>(DEFAULT_HEURISTICS)

  // ── History ──
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/backend/heuristics')
      .then(r => r.json())
      .then((data: Heuristic[]) => { if (Array.isArray(data) && data.length) setHeuristics(data) })
      .catch(() => {})
  }, [])

  const loadHistory = () => {
    fetch('/api/backend/history')
      .then(r => r.json())
      .then((data: HistoryEntry[]) => { if (Array.isArray(data)) setHistory(data) })
      .catch(() => {})
  }

  useEffect(() => { loadHistory() }, [])

  // ── Handlers ──
  const toggleFocus = (id: number) => {
    setFocusAreas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleAnalyse = async () => {
    setLoading(true); setError(null); setResult(null); setCompareResult(null); setSavedId(null)
    try {
      if (mode === 'single') {
        const body: Record<string, unknown> = { description, focus_areas: focusAreas, context }
        if (singleImage) body.image_base64 = await fileToBase64(singleImage)
        const res = await fetch('/api/backend/review', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(await res.text() || `Server error ${res.status}`)
        setResult(await res.json())
      } else {
        const beforeReq: Record<string, unknown> = { description, context }
        const afterReq: Record<string, unknown> = { description, context }
        if (beforeImage) beforeReq.image_base64 = await fileToBase64(beforeImage)
        if (afterImage) afterReq.image_base64 = await fileToBase64(afterImage)
        const res = await fetch('/api/backend/compare', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ before: beforeReq, after: afterReq, context }),
        })
        if (!res.ok) throw new Error(await res.text() || `Server error ${res.status}`)
        setCompareResult(await res.json())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result && !compareResult) return
    const isCompare = !!compareResult
    const autoTitle = isCompare
      ? `Before/After — ${description.slice(0, 40) || 'comparison'}`
      : description.slice(0, 50) || (singleImage?.name ?? 'Screenshot analysis')

    const body = {
      type: isCompare ? 'compare' : 'single',
      title: autoTitle,
      overall_score: result?.overall_score,
      overall_delta: compareResult?.overall_delta,
      result: isCompare ? compareResult : result,
    }
    try {
      const res = await fetch('/api/backend/history', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const entry = await res.json()
      setSavedId(entry.id)
      loadHistory()
    } catch { /* silent */ }
  }

  const handleLoadHistoryEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/backend/history/${id}`)
      const entry = await res.json()
      setError(null)
      if (entry.type === 'compare') {
        setCompareResult(entry.result)
        setResult(null)
      } else {
        setResult(entry.result)
        setCompareResult(null)
      }
      setSavedId(id)
      setHistoryOpen(false)
    } catch { /* silent */ }
  }

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/backend/history/${id}`, { method: 'DELETE' })
      setHistory(prev => prev.filter(h => h.id !== id))
      if (savedId === id) setSavedId(null)
    } catch { /* silent */ }
  }

  const canAnalyse = !loading && (
    mode === 'single'
      ? singleImage !== null || description.trim().length > 0
      : (beforeImage !== null || description.trim().length > 0) &&
        (afterImage !== null || description.trim().length > 0)
  )

  const hasResult = result !== null || compareResult !== null

  // ── Left panel ───────────────────────────────────────────────────────────────

  const leftPanel = (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border"
          style={{ backgroundColor: 'var(--accent-dim)', borderColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}>
          <svg className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>AI UX REVIEW</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Heuristic evaluation</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-md border p-0.5" style={{ borderColor: 'var(--bg-border)', backgroundColor: 'var(--bg-elevated)' }}>
        {(['single', 'compare'] as const).map(m => (
          <button key={m}
            onClick={() => { setMode(m); setResult(null); setCompareResult(null); setError(null); setSavedId(null) }}
            className="flex-1 rounded py-1.5 text-xs font-semibold uppercase tracking-widest transition-all duration-150"
            style={{
              background: mode === m ? 'var(--bg-surface)' : 'transparent',
              color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            {m === 'single' ? 'Single Review' : 'Before & After'}
          </button>
        ))}
      </div>

      {/* Upload zones */}
      {mode === 'single' ? (
        <UploadZone file={singleImage} onFile={f => setSingleImage(f?.name ? f : null)} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <UploadZone file={beforeImage} onFile={f => setBeforeImage(f?.name ? f : null)} label="Before" />
          <UploadZone file={afterImage} onFile={f => setAfterImage(f?.name ? f : null)} label="After" />
        </div>
      )}

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="label-sm">Description / Context</label>
        <textarea className="input-base resize-none" rows={4}
          placeholder="Describe the UI, user flow, or add context for the analysis…"
          value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      {/* Additional context (compare mode) */}
      {mode === 'compare' && (
        <div className="flex flex-col gap-1.5">
          <label className="label-sm">Additional Context</label>
          <textarea className="input-base resize-none" rows={2}
            placeholder="What changed between versions?"
            value={context} onChange={e => setContext(e.target.value)} />
        </div>
      )}

      {/* Focus areas */}
      <div className="flex flex-col gap-2 rounded-lg border px-3 py-2.5"
        style={{ borderColor: 'var(--bg-border)', backgroundColor: 'var(--bg-elevated)' }}>
        <button className="flex w-full items-center justify-between" onClick={() => setFocusExpanded(v => !v)}>
          <span className="label-sm">Focus areas</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {focusAreas.length === 10 ? 'all' : `${focusAreas.length}/10`}
            </span>
            <svg className="h-3.5 w-3.5 transition-transform duration-200"
              style={{ transform: focusExpanded ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--text-muted)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        {focusExpanded && (
          <div className="flex flex-col gap-1.5 border-t pt-1" style={{ borderColor: 'var(--bg-border)' }}>
            <div className="flex gap-3 pb-1">
              <button className="text-[10px]" style={{ color: 'var(--accent)' }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                onClick={() => setFocusAreas([1,2,3,4,5,6,7,8,9,10])}>Select all</button>
              <button className="text-[10px]" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                onClick={() => setFocusAreas([])}>Clear</button>
            </div>
            {heuristics.map(h => (
              <label key={h.id} className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={focusAreas.includes(h.id)} onChange={() => toggleFocus(h.id)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--accent)]" />
                <span className="text-xs leading-tight" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-mono text-[10px] mr-1" style={{ color: 'var(--text-muted)' }}>H{h.id}</span>
                  {h.name}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Analyse button */}
      <button className="btn-primary flex items-center justify-center gap-2 mt-auto"
        disabled={!canAnalyse} onClick={handleAnalyse}>
        {loading ? (
          <><Spinner /><span>Analysing…</span></>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Analyse</span>
          </>
        )}
      </button>
    </div>
  )

  // ── Right panel ──────────────────────────────────────────────────────────────

  const SaveButton = () => (
    <button
      onClick={handleSave}
      disabled={!!savedId}
      className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all"
      style={{
        borderColor: savedId ? 'rgba(34,197,94,0.4)' : 'var(--bg-border)',
        color: savedId ? '#22c55e' : 'var(--text-secondary)',
        backgroundColor: savedId ? 'rgba(34,197,94,0.06)' : 'transparent',
      }}
    >
      {savedId ? (
        <><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>Saved</>
      ) : (
        <><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>Save</>
      )}
    </button>
  )

  const rightPanelSingle = result && (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-start gap-4 rounded-xl border p-4"
        style={{ borderColor: 'var(--bg-border)', backgroundColor: 'var(--bg-surface)' }}>
        <OverallBadge score={result.overall_score} label="Score" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="label-sm">Overall assessment</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{formatDate(result.generated_at)}</span>
              <SaveButton />
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{result.summary}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {result.heuristics.map(h => <HeuristicCard key={h.id} h={h} />)}
      </div>
    </div>
  )

  const rightPanelCompare = compareResult && (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-start gap-4 rounded-xl border p-4"
        style={{ borderColor: 'var(--bg-border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border text-center"
          style={{
            borderColor: deltaColor(compareResult.overall_delta) + '40',
            backgroundColor: deltaColor(compareResult.overall_delta) + '12',
          }}>
          <span className="font-mono text-lg font-bold leading-none" style={{ color: deltaColor(compareResult.overall_delta) }}>
            {compareResult.overall_delta > 0 ? '+' : ''}{compareResult.overall_delta.toFixed(1)}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Delta</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <OverallBadge score={compareResult.before.overall_score} label="Before" />
              <svg className="h-4 w-4" style={{ color: 'var(--text-dim)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <OverallBadge score={compareResult.after.overall_score} label="After" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{formatDate(compareResult.generated_at)}</span>
              <SaveButton />
            </div>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{compareResult.summary}</p>
        </div>
      </div>

      {(compareResult.improvements.length > 0 || compareResult.regressions.length > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {compareResult.improvements.length > 0 && (
            <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(34,197,94,0.2)', backgroundColor: 'rgba(34,197,94,0.04)' }}>
              <p className="mb-2 label-sm" style={{ color: 'rgba(34,197,94,0.7)' }}>Improvements</p>
              <ul className="flex flex-col gap-1.5">
                {compareResult.improvements.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'rgba(34,197,94,0.85)' }}>
                    <span className="mt-1 text-[8px]">▲</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {compareResult.regressions.length > 0 && (
            <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.04)' }}>
              <p className="mb-2 label-sm" style={{ color: 'rgba(239,68,68,0.7)' }}>Regressions</p>
              <ul className="flex flex-col gap-1.5">
                {compareResult.regressions.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'rgba(239,68,68,0.85)' }}>
                    <span className="mt-1 text-[8px]">▼</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-[1fr_140px_140px_80px] gap-3 px-4">
        {['Heuristic', 'Before', 'After', 'Delta'].map(h => (
          <span key={h} className="label-sm">{h}</span>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {compareResult.deltas.map(d => <CompareRow key={d.id} d={d} />)}
      </div>
    </div>
  )

  const rightContent = error ? (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border"
        style={{ borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.07)' }}>
        <svg className="h-6 w-6" style={{ color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>Analysis failed</p>
        <p className="mt-1 max-w-sm text-xs" style={{ color: 'var(--text-muted)' }}>{error}</p>
      </div>
      <button className="mt-1 rounded-md border px-4 py-1.5 text-xs transition-colors"
        style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bg-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
        onClick={() => setError(null)}>Dismiss</button>
    </div>
  ) : result ? rightPanelSingle
    : compareResult ? rightPanelCompare
    : loading ? (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-pulse-soft rounded-full border"
            style={{ borderColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }} />
          <svg className="animate-spin-slow h-8 w-8" style={{ color: 'var(--accent)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle className="opacity-10" cx="12" cy="12" r="10" strokeWidth="2" />
            <path className="opacity-90" strokeLinecap="round" strokeWidth="2" d="M12 2a10 10 0 0110 10" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Analysing…</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Running heuristic evaluation</p>
        </div>
      </div>
    ) : (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border"
          style={{ borderColor: 'var(--bg-border)', backgroundColor: 'var(--bg-surface)' }}>
          <svg className="h-8 w-8" style={{ color: 'var(--bg-border-alt)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No analysis yet</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
            Upload a screenshot or describe a UI to begin
          </p>
        </div>
      </div>
    )

  // ── History drawer ───────────────────────────────────────────────────────────

  const historyDrawer = historyOpen && (
    <div className="absolute inset-y-0 right-0 flex w-80 flex-col border-l shadow-2xl z-20"
      style={{ borderColor: 'var(--bg-border)', backgroundColor: 'var(--bg-surface)' }}>
      <div className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--bg-border)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Saved Analyses</span>
        <button onClick={() => setHistoryOpen(false)}
          className="text-lg leading-none transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>×</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No saved analyses yet.</p>
            <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
              Run an analysis and click Save to store results.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: 'var(--bg-border)' }}>
            {history.map(entry => (
              <button key={entry.id}
                className="group flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors"
                style={{ backgroundColor: savedId === entry.id ? 'var(--accent-dim)' : 'transparent' }}
                onMouseEnter={e => { if (savedId !== entry.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-elevated)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = savedId === entry.id ? 'var(--accent-dim)' : 'transparent' }}
                onClick={() => handleLoadHistoryEntry(entry.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {entry.title || 'Untitled'}
                  </span>
                  <button
                    className="shrink-0 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    onClick={e => handleDeleteHistory(entry.id, e)}>delete</button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
                    style={{ backgroundColor: 'var(--bg-border)', color: 'var(--text-muted)' }}>
                    {entry.type}
                  </span>
                  {entry.overall_score != null && (
                    <span className="font-mono text-[10px]" style={{ color: scoreColor(entry.overall_score) }}>
                      {entry.overall_score.toFixed(1)}/10
                    </span>
                  )}
                  {entry.overall_delta != null && (
                    <span className="font-mono text-[10px]" style={{ color: deltaColor(entry.overall_delta) }}>
                      {entry.overall_delta > 0 ? '+' : ''}{entry.overall_delta.toFixed(1)} Δ
                    </span>
                  )}
                  <span className="ml-auto text-[10px]" style={{ color: 'var(--text-dim)' }}>
                    {formatDate(entry.created_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── Layout ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Top bar */}
      <div className="flex h-10 flex-none items-center gap-3 border-b px-4"
        style={{ borderColor: 'var(--bg-border)', backgroundColor: 'var(--bg-surface)' }}>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--accent)' }}>
          AI UX Review
        </span>
        <div className="ml-auto flex items-center gap-2">
          {/* History button */}
          <button
            onClick={() => { setHistoryOpen(o => !o); if (!historyOpen) loadHistory() }}
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-all"
            style={{
              borderColor: historyOpen ? 'var(--accent)' : 'var(--bg-border)',
              color: historyOpen ? 'var(--accent)' : 'var(--text-secondary)',
              backgroundColor: historyOpen ? 'var(--accent-dim)' : 'transparent',
            }}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
            {history.length > 0 && (
              <span className="rounded-full px-1 py-0.5 text-[9px] font-bold leading-none"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-base)' }}>
                {history.length}
              </span>
            )}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-7 w-7 items-center justify-center rounded-md border transition-all"
            style={{ borderColor: 'var(--bg-border)', color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bg-border)')}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="shrink-0 border-r" style={{ width: 380, borderColor: 'var(--bg-border)', backgroundColor: 'var(--bg-surface)' }}>
          {leftPanel}
        </div>

        {/* Right panel (relative for drawer positioning) */}
        <div className="relative flex-1 min-w-0" style={{ backgroundColor: 'var(--bg-base)' }}>
          {rightContent}
          {historyDrawer}
        </div>
      </div>
    </div>
  )
}
