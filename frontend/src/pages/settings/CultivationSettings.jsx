import { useState, useEffect } from 'react'
import { getRecipes, getCycles } from '../../api/client.js'
import ToggleSwitch from '../../components/ui/ToggleSwitch.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'

const ALERTS = [
  { label: 'CRIT: Pump Failure', desc: 'Notify via SMS + Push', severity: 'critical', enabled: true },
  { label: 'TEMP > 30°C', desc: 'Priority: High', severity: 'high', enabled: true },
  { label: 'HUM < 70%', desc: 'Priority: Medium', severity: 'medium', enabled: false },
]

function CultivationSettings() {
  const [recipes, setRecipes] = useState([])
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tempVal] = useState(24.5)
  const [humVal] = useState(92)

  async function loadData() {
    try {
      const [rec, cyc] = await Promise.all([
        getRecipes().catch(() => []),
        getCycles().catch(() => []),
      ])
      setRecipes(rec)
      setCycles(cyc)
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

  const activeRecipe = recipes.length > 0 ? recipes[0] : null

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface mb-1">Cultivation Configuration</h1>
        <p className="text-on-surface-variant text-body-md">Environmental parameters, automation logic and critical thresholds.</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 lg:col-span-8 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">settings_input_composite</span>
              <h3 className="font-label-caps text-label-caps text-on-surface-variant">ENVIRONMENT PARAMETERS</h3>
            </div>
            <span className="text-data-sm text-secondary bg-secondary/10 px-2 py-1 rounded">REAL-TIME SYNC</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/30">
              <div className="flex justify-between items-end mb-2">
                <label className="font-label-caps text-10px text-on-surface-variant">TEMPERATURE (°C)</label>
                <span className="text-headline-md text-primary">{tempVal}</span>
              </div>
              <div className="relative h-2 bg-background rounded-full overflow-hidden mt-3">
                <div className="absolute left-1/4 right-1/4 h-full bg-primary/40" />
                <div className="absolute left-1/2 -ml-1 w-2 h-full bg-primary" />
              </div>
              <div className="flex justify-between font-data-sm text-on-surface-variant mt-2">
                <span>18°C</span>
                <span className="text-primary">Optimal Range</span>
                <span>32°C</span>
              </div>
            </div>
            <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/30">
              <div className="flex justify-between items-end mb-2">
                <label className="font-label-caps text-10px text-on-surface-variant">HUMIDITY (%)</label>
                <span className="text-headline-md text-secondary">{humVal}</span>
              </div>
              <div className="relative h-2 bg-background rounded-full overflow-hidden mt-3">
                <div className="absolute left-2/3 right-1/4 h-full bg-secondary/40" />
                <div className="absolute left-[92%] -ml-1 w-2 h-full bg-secondary" />
              </div>
              <div className="flex justify-between font-data-sm text-on-surface-variant mt-2">
                <span>60%</span>
                <span className="text-secondary">High Saturation</span>
                <span>100%</span>
              </div>
            </div>
          </div>
          <div className="h-36 w-full bg-surface-container-lowest rounded-lg overflow-hidden relative border border-outline-variant/20">
            <div className="absolute top-2 left-2 font-label-caps text-9px text-on-surface-variant opacity-50">MYCELIAL GROWTH PROJECTION (24H)</div>
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 80">
              <defs>
                <linearGradient id="growthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
                  <stop offset="100%" stopColor="#0f1412" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 60 Q 100 50, 200 30 T 400 10" fill="none" stroke="#6bfb9a" strokeWidth="1.5" className="bioluminescent-path" />
              <path d="M0 60 Q 100 50, 200 30 T 400 10 L 400 80 L 0 80 Z" fill="url(#growthGrad)" opacity="0.1" />
            </svg>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-4 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-tertiary">restaurant_menu</span>
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">RECIPE MANAGEMENT</h3>
          </div>
          {recipes.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-48px text-on-surface-variant opacity-30 mb-2">potted_plant</span>
              <p className="text-body-md text-on-surface-variant">No recipes defined</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {recipes.map(r => (
                <div key={r.id} className="p-3 bg-surface-container border-l-2 border-primary rounded-r-md cursor-pointer hover:bg-surface-container-high transition-all group">
                  <div className="flex justify-between items-start">
                    <p className="font-mono text-data-sm text-primary">{r.name || `Recipe #${r.id}`}</p>
                    <span className="material-symbols-outlined text-on-surface-variant text-sm group-hover:text-primary">check_circle</span>
                  </div>
                  {r.type && <p className="text-10px text-on-surface-variant mt-1">{r.type}</p>}
                </div>
              ))}
            </div>
          )}
          <button className="w-full mt-4 border border-dashed border-outline text-on-surface-variant font-label-caps text-label-caps py-2.5 rounded hover:border-primary hover:text-primary transition-all">
            + NEW RECIPE
          </button>
        </section>

        <section className="col-span-12 md:col-span-7 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-secondary">precision_manufacturing</span>
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">AUTOMATION ENGINE</h3>
          </div>
          <div className="space-y-3">
            {[
              { condition: 'CO2 Sensor > 1000 ppm', action: 'Extract Air' },
              { condition: 'Light (UV) ON for 12 hrs', action: 'Darkness Cycle' },
            ].map((rule, i) => (
              <div key={i} className="flex items-center gap-3 bg-surface-container-lowest p-3 rounded border border-outline-variant/30">
                <span className="font-label-caps bg-primary/20 text-primary px-2 py-1 rounded text-9px">IF</span>
                <span className="flex-1 text-data-sm text-on-surface-variant">{rule.condition}</span>
                <span className="font-label-caps bg-secondary/20 text-secondary px-2 py-1 rounded text-9px">THEN</span>
                <span className="text-data-sm text-secondary">{rule.action}</span>
              </div>
            ))}
          </div>
          <button className="w-full mt-3 py-2 border border-dashed border-outline text-on-surface-variant font-label-caps text-label-caps rounded hover:border-secondary hover:text-secondary transition-all">
            + ADD RULE
          </button>
        </section>

        <section className="col-span-12 md:col-span-5 glass-card p-5 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-error">notification_important</span>
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">ALERT THRESHOLDS</h3>
          </div>
          <div className="space-y-3">
            {ALERTS.map((alert, i) => (
              <div
                key={i}
                className={`flex justify-between items-center p-3 rounded ${
                  alert.severity === 'critical'
                    ? 'bg-error-container/10 border border-error/20'
                    : 'bg-surface-container-low border border-outline-variant/30'
                }`}
              >
                <div>
                  <p className={`text-data-sm ${alert.severity === 'critical' ? 'text-error' : 'text-on-surface'}`}>{alert.label}</p>
                  <p className="text-10px text-on-surface-variant">{alert.desc}</p>
                </div>
                <ToggleSwitch checked={alert.enabled} onChange={() => {}} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default CultivationSettings
