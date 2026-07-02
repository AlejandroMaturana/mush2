import { useState, useEffect } from 'react'
import { getRecipes, createRecipe } from '../api/client.js'
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
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <span className="material-symbols-outlined text-48px text-primary opacity-50 mb-4 animate-pulse">sync</span>
        <p className="text-body-md text-on-surface-variant">Loading recipes...</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-end pb-4 mb-4 border-b border-outline-variant/30">
        <div>
          <h1 className="text-headline-lg text-on-surface">Recipe Management</h1>
          <p className="text-body-md text-on-surface-variant">
            System Latency: 12ms | Active Protocols: {String(recipes.length).padStart(2, '0')}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2 rounded-lg flex items-center gap-2 hover:brightness-110 transition-all active:scale-95"
          style={{ border: 'none', cursor: 'pointer', boxShadow: '0 0 12px rgba(74,222,128,0.1)' }}
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
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
          <div className="lg:col-span-8 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-surface-container-low rounded-t-card border border-outline-variant/20">
              <span className="font-label-caps text-label-caps text-on-surface-variant">LIBRARY_ACTIVE_REGISTRY</span>
              <div className="flex gap-2">
                <span className="text-data-sm text-on-surface-variant font-mono">{recipes.length} protocols</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto border-x border-b border-outline-variant/20 rounded-b-card">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-on-surface-variant font-label-caps text-9px sticky top-0 bg-surface z-10">
                    <th className="px-4 py-2">PROTOCOL_ID</th>
                    <th className="px-4 py-2">SPECIES_IDENTIFIER</th>
                    <th className="px-4 py-2">DURATION</th>
                    <th className="px-4 py-2">VISUAL_PHASE_SEQUENCE</th>
                    <th className="px-4 py-2 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.map(r => (
                    <tr key={r.id} className="hover:bg-surface-container-highest/40 transition-colors bg-surface-container-low/30">
                      <td className="px-4 py-3 border-y border-x border-outline-variant/10 rounded-l-lg">
                        <div className="font-label-caps text-label-caps text-primary">{r.name}</div>
                        <div className="text-11px font-mono text-on-surface">{r.species}</div>
                      </td>
                      <td className="px-4 py-3 border-y border-outline-variant/10">
                        <span className="italic text-body-md text-secondary">{r.species}</span>
                      </td>
                      <td className="px-4 py-3 border-y border-outline-variant/10">
                        <span className="text-data-sm text-on-surface-variant font-mono">
                          {(r.incubationDurationDays || 0) + (r.fruitingDurationDays || 0)} DAYS
                        </span>
                      </td>
                      <td className="px-4 py-3 border-y border-outline-variant/10 min-w-[140px">
                        <PhaseSegments incubationDays={r.incubationDurationDays} fruitingDays={r.fruitingDurationDays} />
                      </td>
                      <td className="px-4 py-3 border-y border-x border-outline-variant/10 rounded-r-lg text-right">
                        <span className="font-label-caps text-9px px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded">
                          STABLE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3 overflow-y-auto">
            <div className="p-4 border border-outline-variant rounded-card bg-surface-container grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center">
                <span className="font-label-caps text-10px text-on-surface-variant mb-2">NUTRIENT_PH</span>
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="38" fill="none" stroke="var(--surface-variant)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="var(--spore-green)" strokeWidth="8" strokeDasharray="170 251.2" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-18px font-mono font-semibold text-primary">6.58</span>
                    <span className="font-label-caps text-8px text-on-surface-variant">OPTIMAL</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-label-caps text-10px text-on-surface-variant mb-2">ROOM_TEMP</span>
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="38" fill="none" stroke="var(--surface-variant)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="var(--error-red)" strokeWidth="8" strokeDasharray="200 251.2" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-18px font-mono font-semibold text-error">79°F</span>
                    <span className="font-label-caps text-8px text-on-surface-variant">HIGH</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 border border-outline-variant rounded bg-surface-container-low">
                <div className="font-label-caps text-8px text-on-surface-variant">TDS_CONC</div>
                <div className="text-20px font-mono font-semibold text-primary">51.9<span className="text-12px ml-1 font-mono">ppm</span></div>
              </div>
              <div className="p-3 border border-outline-variant rounded bg-surface-container-low">
                <div className="font-label-caps text-8px text-on-surface-variant">CO2_LVL</div>
                <div className="text-20px font-mono font-semibold text-secondary">842<span className="text-12px ml-1 font-mono">ppm</span></div>
              </div>
            </div>

            <div className="flex-1 border border-outline-variant/30 rounded-card p-4 bg-surface-container-lowest flex flex-col min-h-[200px">
              <div className="flex justify-between items-center mb-4">
                <span className="font-label-caps text-label-caps text-secondary">ORGANISM_CONNECTOME</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="font-label-caps text-8px text-primary">LIVE_STREAM</span>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <svg className="w-full h-full max-h-[200px" viewBox="0 0 400 400">
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur result="coloredBlur" stdDeviation="2.5" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path d="M 0 50 L 400 50 M 0 150 L 400 150 M 0 250 L 400 250 M 0 350 L 400 350" fill="none" stroke="var(--surface-variant)" strokeWidth="0.5" />
                  <path d="M 50 0 L 50 400 M 150 0 L 150 400 M 250 0 L 250 400 M 350 0 L 350 400" fill="none" stroke="var(--surface-variant)" strokeWidth="0.5" />
                  <g filter="url(#glow)">
                    <path d="M 200 400 C 200 300 100 300 100 200 C 100 100 300 100 300 200 C 300 300 200 300 200 200" fill="none" opacity="0.6" stroke="var(--spore-green)" strokeWidth="2" className="bioluminescent-path" />
                    <path d="M 0 200 C 100 200 150 150 200 200 C 250 250 300 200 400 200" fill="none" opacity="0.4" stroke="var(--teal)" strokeWidth="1.5" className="bioluminescent-path" style={{ animationDelay: '-5s' }} />
                    <circle cx="200" cy="200" fill="var(--spore-green)" r="4" className="animate-pulse" />
                    <circle cx="100" cy="200" fill="var(--teal)" r="2" />
                    <circle cx="300" cy="200" fill="var(--teal)" r="2" />
                    <circle cx="200" cy="115" fill="var(--spore-green)" r="2" />
                  </g>
                </svg>
              </div>
              <div className="mt-4 pt-4 border-t border-outline-variant/30 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="font-label-caps text-7px text-on-surface-variant">NODES</div>
                  <div className="text-data-sm text-primary">1,204</div>
                </div>
                <div className="text-center">
                  <div className="font-label-caps text-7px text-on-surface-variant">FLUX</div>
                  <div className="text-data-sm text-secondary">0.84 Hz</div>
                </div>
                <div className="text-center">
                  <div className="font-label-caps text-7px text-on-surface-variant">SYNC</div>
                  <div className="text-data-sm text-primary">98.2%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: 'rgba(15, 20, 18, 0.85)', backdropFilter: 'blur(4px)' }}>
          <div className="relative bg-surface border border-outline-variant rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
              <h2 className="text-headline-md text-primary">Compile New Organism Recipe</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-on-surface-variant hover:text-error transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              <section>
                <div className="font-label-caps text-label-caps text-secondary mb-4">01. BIOLOGICAL_META</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-label-caps text-9px text-on-surface-variant block mb-1">RECIPE_NAME</label>
                    <input
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      required
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary"
                      placeholder="e.g. ULTRA_LION_MAINE"
                    />
                  </div>
                  <div>
                    <label className="font-label-caps text-9px text-on-surface-variant block mb-1">TAXONOMIC_ID</label>
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
                <div className="font-label-caps text-label-caps text-secondary mb-4">02. INCUBATION_PARAMETERS</div>
                <div className="border border-outline-variant rounded-lg p-4 space-y-4 bg-surface-container-low">
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">TEMP_MIN</label>
                      <input type="number" step="0.1" value={form.incubationTempMin} onChange={e => setForm({...form, incubationTempMin: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">TEMP_MAX</label>
                      <input type="number" step="0.1" value={form.incubationTempMax} onChange={e => setForm({...form, incubationTempMax: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">HUM_MIN</label>
                      <input type="number" step="0.1" value={form.incubationHumMin} onChange={e => setForm({...form, incubationHumMin: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">HUM_MAX</label>
                      <input type="number" step="0.1" value={form.incubationHumMax} onChange={e => setForm({...form, incubationHumMax: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">DAYS</label>
                      <input type="number" value={form.incubationDurationDays} onChange={e => setForm({...form, incubationDurationDays: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="font-label-caps text-label-caps text-secondary mb-4">03. FRUITING_PARAMETERS</div>
                <div className="border border-outline-variant rounded-lg p-4 space-y-4 bg-surface-container-low">
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">TEMP_MIN</label>
                      <input type="number" step="0.1" value={form.fruitingTempMin} onChange={e => setForm({...form, fruitingTempMin: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">TEMP_MAX</label>
                      <input type="number" step="0.1" value={form.fruitingTempMax} onChange={e => setForm({...form, fruitingTempMax: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">HUM_MIN</label>
                      <input type="number" step="0.1" value={form.fruitingHumMin} onChange={e => setForm({...form, fruitingHumMin: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">HUM_MAX</label>
                      <input type="number" step="0.1" value={form.fruitingHumMax} onChange={e => setForm({...form, fruitingHumMax: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-label-caps text-8px text-on-surface-variant block mb-1">DAYS</label>
                      <input type="number" value={form.fruitingDurationDays} onChange={e => setForm({...form, fruitingDurationDays: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-data-sm focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="font-label-caps text-label-caps text-secondary mb-4">04. FAE_CONFIG</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-label-caps text-9px text-on-surface-variant block mb-1">FAE_INTERVAL (min)</label>
                    <input type="number" value={form.faeIntervalMinutes} onChange={e => setForm({...form, faeIntervalMinutes: e.target.value})}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-data-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="font-label-caps text-9px text-on-surface-variant block mb-1">VENT_STRATEGY</label>
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
                  className="font-label-caps text-10px text-on-surface-variant border border-outline-variant px-6 py-2 rounded-lg hover:bg-surface-variant transition-colors"
                  style={{ background: 'none', cursor: 'pointer' }}
                >
                  ABORT_ACTION
                </button>
                <button
                  type="submit"
                  className="font-label-caps text-10px text-on-primary bg-primary px-8 py-2 rounded-lg hover:brightness-110 transition-all active:scale-95"
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  COMPILE_PROTOCOL
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
