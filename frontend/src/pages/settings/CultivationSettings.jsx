import { useState, useEffect } from 'react'
import { getDevices, getLatestTelemetry, getRecipes, getCycles } from '../../api/client.js'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'

const ENV_PARAMS = [
  { key: 'temperature', label: 'TEMPERATURE', unit: '°C', icon: 'thermostat', min: 18, max: 32, optimal: 'Optimal Range' },
  { key: 'humidity', label: 'HUMIDITY', unit: '%', icon: 'water_drop', min: 60, max: 100, optimal: 'High Saturation' },
]

function CultivationSettings() {
  const [devices, setDevices] = useState([])
  const [telemetry, setTelemetry] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadData() {
    try {
      const [devs, rec, cyc] = await Promise.all([
        getDevices().catch(() => []),
        getRecipes().catch(() => []),
        getCycles().catch(() => []),
      ])
      setDevices(devs)
      setRecipes(rec)
      setCycles(cyc)
      if (devs[0]) {
        const tel = await getLatestTelemetry(devs[0].id).catch(() => null)
        setTelemetry(tel)
      }
      setError(null)
    } catch (err) {
      setError(err.message || 'Connection error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState message="Loading cultivation configuration..." icon="potted_plant" />
  if (error) return <ErrorState message={error} onRetry={loadData} />

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface mb-1">Cultivation Configuration</h1>
        <p className="text-on-surface-variant text-body-md">Environmental parameters, connection status, recipes and cycles.</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 lg:col-span-8 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-primary">settings_input_composite</span>
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">ENVIRONMENT PARAMETERS</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {ENV_PARAMS.map(param => {
              const value = telemetry ? telemetry[param.key] : null
              const pct = value != null ? ((value - param.min) / (param.max - param.min)) * 100 : 50
              return (
                <div key={param.key} className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/30">
                  <div className="flex justify-between items-end mb-2">
                    <label className="font-label-caps text-10px text-on-surface-variant">{param.label} ({param.unit})</label>
                    <span className="text-headline-md text-primary">{value != null ? value : '—'}</span>
                  </div>
                  <div className="relative h-2 bg-background rounded-full overflow-hidden mt-3">
                    <div className="absolute inset-0 opacity-30" style={{ background: `linear-gradient(to right, transparent ${pct}%, var(--primary))` }} />
                    <div className="absolute w-2 h-full bg-primary rounded-full" style={{ left: `calc(${pct}% - 4px)` }} />
                  </div>
                  <div className="flex justify-between font-data-sm text-on-surface-variant mt-2">
                    <span>{param.min}{param.unit}</span>
                    <span className="text-primary">{param.optimal}</span>
                    <span>{param.max}{param.unit}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="col-span-12 lg:col-span-4 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-tertiary">restaurant_menu</span>
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">RECIPES</h3>
          </div>
          {recipes.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-48px text-on-surface-variant opacity-30 mb-2">potted_plant</span>
              <p className="text-body-md text-on-surface-variant">No recipes defined</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {recipes.map(r => (
                <div key={r.id} className="p-3 bg-surface-container border-l-2 border-primary rounded-r-md">
                  <div className="flex justify-between items-start">
                    <p className="font-mono text-data-sm text-primary">{r.name || `Recipe #${r.id}`}</p>
                  </div>
                  {r.species && <p className="text-10px text-on-surface-variant mt-1">{r.species}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="col-span-12 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-secondary">cyclone</span>
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">ACTIVE CYCLES</h3>
          </div>
          {cycles.length === 0 ? (
            <p className="text-body-md text-on-surface-variant py-4 text-center">No active cultivation cycles</p>
          ) : (
            <div className="space-y-3">
              {cycles.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded border border-outline-variant/30">
                  <div>
                    <p className="text-data-sm text-on-surface">{c.species || `Cycle #${c.id}`}</p>
                    <p className="text-10px text-on-surface-variant">{c.status} — {c.currentPhase || '—'}</p>
                  </div>
                  <span className={`text-10px font-bold ${c.status === 'ACTIVE' ? 'text-primary' : 'text-on-surface-variant'}`}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default CultivationSettings
