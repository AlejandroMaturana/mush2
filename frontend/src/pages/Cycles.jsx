import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCycles, getRecipes, createCycle, updateCycle, getDevices } from '../api/client.js'
import LoadingState from '../components/ui/LoadingState.jsx'

const STATUS_LABELS = { PLANNED: 'Planned', ACTIVE: 'Active', COMPLETED: 'Completed', ABORTED: 'Aborted' }
const PHASE_LABELS = { INCUBATION: 'Incubation', FRUITING: 'Fruiting', MAINTENANCE: 'Maintenance', COMPLETED: 'Completed' }

function CycleCard({ cycle, onUpdate }) {
  const { status, currentPhase, species, strain, startDate, endDate, Recipe } = cycle
  const isActive = status === 'ACTIVE'
  const isPlanned = status === 'PLANNED'
  const isCompleted = status === 'COMPLETED'

  async function handleUpdate(payload) {
    try {
      await updateCycle(cycle.id, payload)
      onUpdate()
    } catch (err) {
      console.error('Error updating cycle:', err)
    }
  }

  return (
    <div className={`bg-surface-container border border-outline-variant rounded-lg p-5 ${isActive ? 'border-l-4 border-l-primary' : isPlanned ? 'border-l-4 border-l-amber' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary' : isPlanned ? 'bg-amber' : 'bg-on-surface-variant'}`} />
            <span className="font-label-caps text-10px text-on-surface-variant">
              {STATUS_LABELS[status] || status} · {PHASE_LABELS[currentPhase] || currentPhase}
            </span>
          </div>
          <h2 className="text-headline-md text-on-surface">{strain || species || 'Unknown'}</h2>
          <p className="text-body-md text-on-surface-variant">{species}</p>
        </div>
        {startDate && (
          <div className="text-right">
            <span className="font-label-caps text-9px text-on-surface-variant block">START DATE</span>
            <span className="text-data-sm text-on-surface font-mono">{new Date(startDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-outline-variant/30">
        <div>
          <span className="font-label-caps text-9px text-on-surface-variant block uppercase">Recipe</span>
          <span className="text-body-md text-on-surface">{Recipe?.name || '—'}</span>
        </div>
        <div>
          <span className="font-label-caps text-9px text-on-surface-variant block uppercase">End Date</span>
          <span className="text-body-md text-on-surface">{endDate ? new Date(endDate).toLocaleDateString() : '—'}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {(isActive || isCompleted) && (
          <Link to={`/cycles/${cycle.id}/bioactives`} className="btn btn-outline flex-1 text-center">
            BIOACTIVES
          </Link>
        )}
        {isActive && (
          <button onClick={() => handleUpdate({ status: 'COMPLETED' })} className="btn btn-primary flex-1">
            COMPLETE
          </button>
        )}
        {isPlanned && (
          <button onClick={() => handleUpdate({ status: 'ACTIVE' })} className="btn btn-primary flex-1">
            START
          </button>
        )}
        {(isActive || isPlanned) && (
          <button onClick={() => handleUpdate({ status: 'ABORTED' })} className="btn btn-danger flex-1">
            ABORT
          </button>
        )}
      </div>
    </div>
  )
}

function Cycles() {
  const [cycles, setCycles] = useState([])
  const [recipes, setRecipes] = useState([])
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ recipeId: '', species: '', strain: '', startDate: '', deviceId: '' })
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    try {
      setError(null)
      const [c, r, d] = await Promise.all([getCycles(), getRecipes(), getDevices()])
      setCycles(c)
      setRecipes(r)
      setDevices(d)
    } catch (err) {
      setError(err.message || 'Error loading cycles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createCycle({
        recipeId: parseInt(form.recipeId, 10),
        species: form.species,
        strain: form.strain || undefined,
        startDate: form.startDate || undefined,
        deviceId: form.deviceId ? parseInt(form.deviceId, 10) : undefined,
      })
      setShowForm(false)
      setForm({ recipeId: '', species: '', strain: '', startDate: '', deviceId: '' })
      await load()
    } catch (err) {
      setError(err.message || 'Error creating cycle')
    } finally {
      setSubmitting(false)
    }
  }

  const active = cycles.filter(c => c.status === 'ACTIVE' || c.status === 'PLANNED')
  const historical = cycles.filter(c => c.status === 'COMPLETED' || c.status === 'ABORTED')

  if (loading) return <LoadingState message="Loading cycles..." icon="cyclone" />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface">Cultivation Cycles</h1>
          <p className="text-body-md text-on-surface-variant">{cycles.length} cycle{cycles.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          <span className="material-symbols-outlined text-18px">add</span>
          NEW CYCLE
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
          <h2 className="text-headline-md text-on-surface mb-4">Active</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {active.map(c => <CycleCard key={c.id} cycle={c} onUpdate={load} />)}
          </div>
        </section>
      )}

      {cycles.length === 0 && !error && (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <span className="material-symbols-outlined text-96px text-on-surface-variant opacity-20 mb-6">cyclone</span>
            <h2 className="text-headline-md text-on-surface mb-4">No Cycles</h2>
            <p className="text-body-md text-on-surface-variant mb-8">
              No cultivation cycles yet. Start a new batch to begin tracking growth.
            </p>
          </div>
        </div>
      )}

      {historical.length > 0 && (
        <section className="mt-4">
          <h3 className="text-headline-md text-on-surface mb-4">History</h3>
          <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="border-b border-outline-variant text-label-caps text-9px text-on-surface-variant">
                    <th className="p-3 font-weight-normal">Start</th>
                    <th className="p-3 font-weight-normal">Species</th>
                    <th className="p-3 font-weight-normal">Status</th>
                    <th className="p-3 font-weight-normal">Phase</th>
                    <th className="p-3 font-weight-normal">Recipe</th>
                    <th className="p-3 font-weight-normal">End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {historical.map(c => (
                    <tr key={c.id} className="hover:bg-surface-container-highest/40 transition-colors">
                      <td className="p-3 text-data-sm text-on-surface-variant font-mono">
                        {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-3">
                        <span className="text-body-md text-on-surface">{c.species || 'Unknown'}</span>
                        {c.strain && <span className="text-9px text-on-surface-variant block">Strain: {c.strain}</span>}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded border text-9px font-bold uppercase ${
                          c.status === 'ABORTED'
                            ? 'border-error/30 text-error bg-error/10'
                            : 'border-primary/30 text-primary bg-primary/10'
                        }`}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </td>
                      <td className="p-3 text-11px font-mono text-on-surface-variant">{PHASE_LABELS[c.currentPhase] || c.currentPhase}</td>
                      <td className="p-3 text-body-md text-on-surface">{c.Recipe?.name || '—'}</td>
                      <td className="p-3 text-data-sm font-mono text-on-surface-variant">
                        {c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: 'color-mix(in srgb, var(--surface-dim) 85%, transparent)', backdropFilter: 'blur(4px)' }}>
          <div className="relative bg-surface border border-outline-variant rounded-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
              <h2 className="text-headline-md text-on-surface">New Cycle</h2>
              <button
                onClick={() => setShowForm(false)}
                className="btn btn-ghost"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="font-label-caps text-9px text-on-surface-variant block mb-1">Recipe</label>
                <select value={form.recipeId} onChange={e => setForm({...form, recipeId: e.target.value})} required
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary cursor-pointer">
                  <option value="">— Select Recipe —</option>
                  {recipes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.species})</option>)}
                </select>
              </div>
              <div>
                <label className="font-label-caps text-9px text-on-surface-variant block mb-1">Device / Chamber</label>
                <select value={form.deviceId} onChange={e => setForm({...form, deviceId: e.target.value})}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary cursor-pointer">
                  <option value="">— No device (manual) —</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.chamberName || d.deviceId}{d.chamberId != null ? ` (Chamber ${d.chamberId})` : ''} {d.macAddress ? `· ${d.macAddress}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-label-caps text-9px text-on-surface-variant block mb-1">Species</label>
                <input value={form.species} onChange={e => setForm({...form, species: e.target.value})} required
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="font-label-caps text-9px text-on-surface-variant block mb-1">Strain</label>
                <input value={form.strain} onChange={e => setForm({...form, strain: e.target.value})}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="font-label-caps text-9px text-on-surface-variant block mb-1">Start Date</label>
                <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="flex justify-end gap-3 pt-2 pb-4">
                <button type="button" onClick={() => setShowForm(false)}
                  className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="btn btn-primary">
                  {submitting ? 'Creating...' : 'Create Cycle'}
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
