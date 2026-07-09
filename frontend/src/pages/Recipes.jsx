import { useState, useEffect } from 'react'
import { getRecipes, createRecipe } from '../api/client.js'
import LoadingState from '../components/ui/LoadingState.jsx'
import RecipesEmptyState from '../components/ui/RecipesEmptyState.jsx'

function PhaseSegments({ incubationDays, fruitingDays }) {
  const total = (incubationDays || 0) + (fruitingDays || 0)
  if (total === 0) return null
  const incubPct = Math.round((incubationDays / total) * 10)
  const fruitPct = Math.min(10 - incubPct, 10)
  return (
    <div className="segment-bar h-1.5">
      {Array.from({ length: incubPct }, (_, i) => (
        <div key={`inc-${i}`} className="segment bg-primary/80" />
      ))}
      {Array.from({ length: fruitPct }, (_, i) => (
        <div key={`frt-${i}`} className="segment bg-secondary/80" />
      ))}
      {Array.from({ length: Math.max(0, 10 - incubPct - fruitPct) }, (_, i) => (
        <div key={`emp-${i}`} className="segment bg-surface-variant" />
      ))}
    </div>
  )
}

function Recipes() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '', species: '',
    incubationTempMin: '', incubationTempMax: '',
    incubationHumMin: '', incubationHumMax: '',
    incubationDurationDays: '',
    fruitingTempMin: '', fruitingTempMax: '',
    fruitingHumMin: '', fruitingHumMax: '',
    fruitingDurationDays: '',
    faeIntervalMinutes: '', ventilationStrategy: 'TIMER',
  })

  async function load() {
    try {
      setError(null)
      const data = await getRecipes()
      setRecipes(data)
    } catch (err) {
      setError(err.message || 'Error loading recipes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createRecipe({
        ...form,
        incubationTempMin: parseFloat(form.incubationTempMin),
        incubationTempMax: parseFloat(form.incubationTempMax),
        incubationHumMin: parseFloat(form.incubationHumMin),
        incubationHumMax: parseFloat(form.incubationHumMax),
        incubationDurationDays: parseInt(form.incubationDurationDays, 10),
        fruitingTempMin: parseFloat(form.fruitingTempMin),
        fruitingTempMax: parseFloat(form.fruitingTempMax),
        fruitingHumMin: parseFloat(form.fruitingHumMin),
        fruitingHumMax: parseFloat(form.fruitingHumMax),
        fruitingDurationDays: parseInt(form.fruitingDurationDays, 10),
        faeIntervalMinutes: parseInt(form.faeIntervalMinutes, 10),
      })
      setShowForm(false)
      setForm({ name: '', species: '', incubationTempMin: '', incubationTempMax: '', incubationHumMin: '', incubationHumMax: '', incubationDurationDays: '', fruitingTempMin: '', fruitingTempMax: '', fruitingHumMin: '', fruitingHumMax: '', fruitingDurationDays: '', faeIntervalMinutes: '', ventilationStrategy: 'TIMER' })
      await load()
    } catch (err) {
      setError(err.message || 'Error creating recipe')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState message="Loading recipes..." icon="science" />

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-end pb-4 mb-4 border-b border-outline-variant/30">
        <div>
          <h1 className="text-headline-lg text-on-surface">Recipes</h1>
          <p className="text-body-md text-on-surface-variant">{recipes.length} recipe{recipes.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          <span className="material-symbols-outlined text-16px">add</span>
          NEW RECIPE
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-error-container/10 border border-error/40 flex items-center gap-3">
          <span className="material-symbols-outlined text-error text-18px">warning</span>
          <span className="text-data-sm text-error font-semibold">{error}</span>
        </div>
      )}

      {recipes.length === 0 ? (
        <RecipesEmptyState onCreate={() => setShowForm(true)} />
      ) : (
        <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b border-outline-variant text-label-caps text-9px text-on-surface-variant">
                  <th className="p-3 font-weight-normal">Name</th>
                  <th className="p-3 font-weight-normal">Species</th>
                  <th className="p-3 font-weight-normal">Duration</th>
                  <th className="p-3 font-weight-normal">Incubation</th>
                  <th className="p-3 font-weight-normal">Fruiting</th>
                  <th className="p-3 font-weight-normal">FAE</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map(r => (
                  <tr key={r.id} className="hover:bg-surface-container-highest/40 transition-colors">
                    <td className="p-3">
                      <span className="text-body-md text-primary font-semibold">{r.name}</span>
                    </td>
                    <td className="p-3 italic text-body-md text-on-surface">{r.species}</td>
                    <td className="p-3">
                      <span className="text-data-sm text-on-surface-variant font-mono">
                        {(r.incubationDurationDays || 0) + (r.fruitingDurationDays || 0)} days
                      </span>
                      <PhaseSegments incubationDays={r.incubationDurationDays} fruitingDays={r.fruitingDurationDays} />
                    </td>
                    <td className="p-3">
                      <span className="text-data-sm text-on-surface-variant font-mono">
                        {r.incubationDurationDays || '?'}d @ {r.incubationTempMin || '?'}-{r.incubationTempMax || '?'}°C / {r.incubationHumMin || '?'}-{r.incubationHumMax || '?'}%RH
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-data-sm text-on-surface-variant font-mono">
                        {r.fruitingDurationDays || '?'}d @ {r.fruitingTempMin || '?'}-{r.fruitingTempMax || '?'}°C / {r.fruitingHumMin || '?'}-{r.fruitingHumMax || '?'}%RH
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-data-sm text-on-surface-variant font-mono">
                        {r.faeIntervalMinutes || '?'} min
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: 'color-mix(in srgb, var(--surface-dim) 85%, transparent)', backdropFilter: 'blur(4px)' }}>
          <div className="relative bg-surface border border-outline-variant rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
              <h2 className="text-headline-md text-on-surface">New Recipe</h2>
              <button
                onClick={() => setShowForm(false)}
                className="btn btn-ghost"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              <section>
                <h3 className="font-label-caps text-label-caps text-secondary mb-4">General</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-label-caps text-9px text-on-surface-variant block mb-1">Name</label>
                    <input
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      required
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary"
                      placeholder="e.g. Lion's Mane Standard"
                    />
                  </div>
                  <div>
                    <label className="font-label-caps text-9px text-on-surface-variant block mb-1">Species</label>
                    <input
                      value={form.species}
                      onChange={e => setForm({...form, species: e.target.value})}
                      required
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm italic focus:outline-none focus:border-primary"
                      placeholder="Hericium erinaceus"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-label-caps text-label-caps text-secondary mb-4">Incubation Parameters</h3>
                <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-low">
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">Temp Min</label>
                      <input type="number" step="0.1" value={form.incubationTempMin} onChange={e => setForm({...form, incubationTempMin: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">Temp Max</label>
                      <input type="number" step="0.1" value={form.incubationTempMax} onChange={e => setForm({...form, incubationTempMax: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">Hum Min</label>
                      <input type="number" step="0.1" value={form.incubationHumMin} onChange={e => setForm({...form, incubationHumMin: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">Hum Max</label>
                      <input type="number" step="0.1" value={form.incubationHumMax} onChange={e => setForm({...form, incubationHumMax: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">Days</label>
                      <input type="number" value={form.incubationDurationDays} onChange={e => setForm({...form, incubationDurationDays: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-label-caps text-label-caps text-secondary mb-4">Fruiting Parameters</h3>
                <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-low">
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">Temp Min</label>
                      <input type="number" step="0.1" value={form.fruitingTempMin} onChange={e => setForm({...form, fruitingTempMin: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">Temp Max</label>
                      <input type="number" step="0.1" value={form.fruitingTempMax} onChange={e => setForm({...form, fruitingTempMax: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">Hum Min</label>
                      <input type="number" step="0.1" value={form.fruitingHumMin} onChange={e => setForm({...form, fruitingHumMin: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">Hum Max</label>
                      <input type="number" step="0.1" value={form.fruitingHumMax} onChange={e => setForm({...form, fruitingHumMax: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">Days</label>
                      <input type="number" value={form.fruitingDurationDays} onChange={e => setForm({...form, fruitingDurationDays: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-label-caps text-label-caps text-secondary mb-4">FAE Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-label-caps text-9px text-on-surface-variant block mb-1">FAE Interval (min)</label>
                    <input type="number" value={form.faeIntervalMinutes} onChange={e => setForm({...form, faeIntervalMinutes: e.target.value})}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="font-label-caps text-9px text-on-surface-variant block mb-1">Ventilation Strategy</label>
                    <select value={form.ventilationStrategy} onChange={e => setForm({...form, ventilationStrategy: e.target.value})}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary cursor-pointer">
                      <option value="TIMER">Timer</option>
                      <option value="CO2_TRIGGER">CO₂ Trigger</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                  </div>
                </div>
              </section>

              <div className="flex justify-end gap-3 pt-2 pb-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? 'Creating...' : 'Create Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Recipes
