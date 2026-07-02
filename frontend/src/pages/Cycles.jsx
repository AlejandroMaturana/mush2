import { useState, useEffect } from 'react'
import { getCycles, getRecipes } from '../api/client.js'

const STATUS_LABELS = { PLANNED: 'PLANNED', ACTIVE: 'RUNNING', COMPLETED: 'COMPLETED', ABORTED: 'ABORTED' }

function CycleChart({ status }) {
  const isPaused = status === 'PAUSED' || status === 'PLANNED'
  const color = isPaused ? 'var(--amber)' : 'var(--spore-green)'
  return (
    <div className="relative h-32 w-full mb-6 bg-black/40 rounded border border-outline-variant/30 p-2 overflow-hidden">
      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 100">
        <defs>
          <linearGradient id={`area-${status}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect fill="rgba(107, 251, 154, 0.05)" height="40" width="400" x="0" y="20" />
        <path d="M 0 80 Q 20 70 50 75 T 100 40 T 150 60 T 200 45 T 250 35 T 300 25 T 350 20 L 400 20 L 400 100 L 0 100 Z"
          fill={`url(#area-${status})`} />
        <path d="M 0 80 Q 20 70 50 75 T 100 40 T 150 60 T 200 45 T 250 35 T 300 25 T 350 20"
          fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={isPaused ? '4 2' : 'none'} />
        {!isPaused && <circle cx="350" cy="20" fill={color} r="4" className="status-glow-running" />}
      </svg>
      <div className="absolute top-2 left-2 font-label-caps text-9px text-primary/60">MYCELIUM_DENSITY_INDEX</div>
    </div>
  )
}

function CycleCard({ cycle }) {
  const isRunning = cycle.status === 'ACTIVE'
  const isPaused = cycle.status === 'PLANNED' || cycle.status === 'PAUSED'
  const borderColor = isRunning ? 'border-l-primary' : isPaused ? 'border-l-amber' : 'border-l-on-surface-variant'
  const glowClass = isRunning ? 'status-glow-running bg-primary' : isPaused ? 'status-glow-paused bg-amber' : 'bg-on-surface-variant'

  return (
    <div className={`glass-panel rounded-lg p-6 relative overflow-hidden border-l-4 ${borderColor}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${glowClass}`} />
            <span className="font-label-caps text-primary text-10px tracking-[0.2em] font-bold">
              SYSTEM_STATE: {STATUS_LABELS[cycle.status] || cycle.status}
            </span>
          </div>
          <h2 className="text-headline-md">{cycle.strain || cycle.species || 'Unknown'}</h2>
          <p className="text-on-surface-variant text-data-sm opacity-60">
            BATCH_ID // {cycle.batchId || `CYC-${String(cycle.id).padStart(4, '0')}`}
          </p>
        </div>
        <div className="text-right">
          <span className="font-label-caps text-on-surface-variant text-10px opacity-60">T-MINUS (DAYS)</span>
          <div className="text-headline-lg font-mono font-semibold text-primary leading-none">
            {cycle.remainingDays != null ? cycle.remainingDays.toFixed(1) : '—'}
          </div>
        </div>
      </div>

      <CycleChart status={cycle.status} />

      <div className="grid grid-cols-2 gap-4 mb-6 border-t border-outline-variant/30 pt-4">
        <div>
          <span className="font-label-caps text-9px text-on-surface-variant opacity-60 uppercase">BIO_PROTOCOL</span>
          <p className="text-body-md text-on-surface font-medium">{cycle.Recipe?.name || cycle.protocol || 'Standard Protocol'}</p>
        </div>
        <div>
          <span className="font-label-caps text-9px text-on-surface-variant opacity-60 uppercase">HARDWARE_NODE</span>
          <p className="text-body-md text-on-surface font-medium">{cycle.deviceName || cycle.chamberName || `Node-${cycle.deviceId || '?'}`}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {isRunning && (
          <button className="flex-1 border border-outline-variant hover:bg-surface-variant font-label-caps text-10px py-2 transition-all active:scale-95"
            style={{ background: 'rgba(0,0,0,0.2)', border: 'none', cursor: 'pointer' }}>
            PAUSE
          </button>
        )}
        {isPaused && (
          <button className="flex-1 bg-primary text-on-primary font-label-caps text-10px py-2 transition-all hover:brightness-110 active:scale-95"
            style={{ border: 'none', cursor: 'pointer', boxShadow: '0 0 10px rgba(107,251,154,0.2)' }}>
            RESUME_SEQ
          </button>
        )}
        <button className="flex-1 border border-outline-variant font-label-caps text-10px py-2 transition-all active:scale-95 text-error"
          style={{ background: 'rgba(0,0,0,0.2)', cursor: 'pointer' }}>
          TERMINATE
        </button>
        <button className="flex-1 bg-surface-container-high hover:bg-surface-container-highest font-label-caps text-10px py-2 transition-all flex items-center justify-center gap-1 border border-outline-variant/50"
          style={{ cursor: 'pointer' }}>
          <span className="material-symbols-outlined text-sm">terminal</span>
          DATA_LOGS
        </button>
      </div>
    </div>
  )
}

function SuccRateBar({ pct }) {
  const filled = Math.round((pct || 0) / 10)
  return (
    <div className="flex gap-[1px]">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={`segmented-bar-segment ${i < filled ? 'active' : ''}`} />
      ))}
    </div>
  )
}

function YieldBar({ value, max }) {
  const filled = max ? Math.round((value / max) * 5) : 0
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={`segmented-bar-segment ${i < filled ? 'active' : ''}`} />
      ))}
    </div>
  )
}

function Cycles() {
  const [cycles, setCycles] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ recipeId: '', species: '', strain: '', startDate: '' })

  async function load() {
    try {
      setError(null)
      const [c, r] = await Promise.all([getCycles(), getRecipes()])
      setCycles(c)
      setRecipes(r)
    } catch (err) {
      setError(err.message || 'Error loading cycles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const active = cycles.filter(c => c.status === 'ACTIVE' || c.status === 'PLANNED')
  const historical = cycles.filter(c => c.status === 'COMPLETED' || c.status === 'ABORTED')

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <span className="material-symbols-outlined text-48px text-primary opacity-50 mb-4 animate-pulse">sync</span>
        <p className="text-body-md text-on-surface-variant">Loading cycles...</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="font-label-caps text-label-caps text-primary mb-2 block uppercase tracking-widest">Bio-System Controller // V4.2</span>
          <h1 className="text-headline-lg text-on-surface tracking-tight">Cultivation Cycles</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-on-primary font-label-caps py-2 px-6 rounded flex items-center gap-2 active:scale-95"
          style={{ border: 'none', cursor: 'pointer', boxShadow: '0 0 15px rgba(107,251,154,0.3)' }}
        >
          <span className="material-symbols-outlined text-18px">add</span>
          INITIATE NEW BATCH
        </button>
      </div>

      {error && (
        <div className="p-3 rounded bg-error-container/10 border border-error/40 flex items-center gap-3">
          <span className="material-symbols-outlined text-error text-18px">warning</span>
          <span className="text-data-sm text-error font-semibold">{error}</span>
        </div>
      )}

      {active.length > 0 && (
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {active.map(c => <CycleCard key={c.id} cycle={c} />)}
          </div>
        </section>
      )}

      {cycles.length === 0 && !error && (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <span className="material-symbols-outlined text-96px text-on-surface-variant opacity-20 mb-6">cyclone</span>
            <h2 className="text-headline-md text-primary mb-4">NO ACTIVE CYCLES</h2>
            <p className="text-body-md text-on-surface-variant mb-8">
              No cultivation cycles are currently running. Start a new batch to begin tracking growth.
            </p>
          </div>
        </div>
      )}

      {historical.length > 0 && (
        <section className="mt-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-headline-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">database</span>
              CENTRAL_ARCHIVE
            </h3>
          </div>
          <div className="glass-panel rounded-lg overflow-hidden border border-outline-variant/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                    <th className="p-4 font-label-caps text-10px text-on-surface-variant/70 tracking-widest">TIMESTAMP</th>
                    <th className="p-4 font-label-caps text-10px text-on-surface-variant/70 tracking-widest">SPECIES_ID</th>
                    <th className="p-4 font-label-caps text-10px text-on-surface-variant/70 tracking-widest">FINAL_STATUS</th>
                    <th className="p-4 font-label-caps text-10px text-on-surface-variant/70 tracking-widest">PROTOCOL</th>
                    <th className="p-4 font-label-caps text-10px text-on-surface-variant/70 tracking-widest">YIELD_NET</th>
                    <th className="p-4 font-label-caps text-10px text-on-surface-variant/70 tracking-widest">SUCC_RATE</th>
                    <th className="p-4 font-label-caps text-10px text-on-surface-variant/70 tracking-widest">X-REF</th>
                  </tr>
                </thead>
                <tbody style={{ borderCollapse: 'collapse' }}>
                  {historical.map(c => {
                    const isAborted = c.status === 'ABORTED'
                    return (
                      <tr key={c.id} className={`transition-colors ${isAborted ? 'hover:bg-error/5' : 'hover:bg-primary/5'}`} style={{ borderTop: '1px solid rgba(61, 74, 62, 0.1)' }}>
                        <td className="p-4 text-data-sm text-on-surface-variant font-mono">
                          {c.startDate ? new Date(c.startDate).toLocaleDateString('en-CA') : '—'}
                        </td>
                        <td className="p-4">
                          <div className={`text-body-md font-semibold ${isAborted ? 'text-error' : 'text-primary'}`}>
                            {c.species || 'Unknown'}
                          </div>
                          <div className="text-9px font-label-caps text-on-surface-variant">
                            BATCH_{c.strain || c.species || '?'}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded border text-9px font-bold uppercase tracking-widest ${isAborted
                            ? 'border-error/30 text-error bg-error/10'
                            : 'border-primary/30 text-primary bg-primary/10'}`}>
                            {STATUS_LABELS[c.status] || c.status}
                          </span>
                        </td>
                        <td className="p-4 text-11px font-mono">{c.Recipe?.name || c.protocol || '—'}</td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className={`text-data-sm ${isAborted ? 'text-error' : 'text-secondary'}`}>
                              {c.yield != null ? `${c.yield}kg` : '—'}
                            </span>
                            <YieldBar value={c.yield || 0} max={2} />
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <SuccRateBar pct={c.successRate} />
                            <span className={`text-data-sm ${isAborted ? 'text-error' : 'text-primary'}`}>
                              {c.successRate != null ? `${c.successRate}%` : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors" style={{ cursor: 'pointer' }}>
                            analytics
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-surface-container-lowest/50 border-t border-outline-variant/30 flex justify-between items-center">
              <span className="font-label-caps text-10px text-on-surface-variant">TOTAL_ENTRIES: {historical.length}</span>
            </div>
          </div>
        </section>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: 'rgba(15, 20, 18, 0.85)', backdropFilter: 'blur(4px)' }}>
          <div className="relative bg-surface border border-outline-variant rounded-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
              <h2 className="text-headline-md text-primary">Initiate New Batch</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-on-surface-variant hover:text-error transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={e => {
              e.preventDefault()
              setShowForm(false)
              setForm({ recipeId: '', species: '', strain: '', startDate: '' })
            }} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="font-label-caps text-9px text-on-surface-variant block mb-1">RECIPE</label>
                <select value={form.recipeId} onChange={e => setForm({...form, recipeId: e.target.value})}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary cursor-pointer">
                  <option value="">— Select Recipe —</option>
                  {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-label-caps text-9px text-on-surface-variant block mb-1">SPECIES</label>
                <input value={form.species} onChange={e => setForm({...form, species: e.target.value})} required
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="font-label-caps text-9px text-on-surface-variant block mb-1">STRAIN</label>
                <input value={form.strain} onChange={e => setForm({...form, strain: e.target.value})}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="font-label-caps text-9px text-on-surface-variant block mb-1">START DATE</label>
                <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="flex justify-end gap-3 pt-2 pb-4">
                <button type="button" onClick={() => setShowForm(false)}
                  className="font-label-caps text-10px text-on-surface-variant border border-outline-variant px-6 py-2 rounded-lg hover:bg-surface-variant transition-colors"
                  style={{ background: 'none', cursor: 'pointer' }}>
                  ABORT
                </button>
                <button type="submit"
                  className="font-label-caps text-10px text-on-primary bg-primary px-8 py-2 rounded-lg hover:brightness-110 transition-all active:scale-95"
                  style={{ border: 'none', cursor: 'pointer' }}>
                  INITIATE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Cycles
