import { useState, useEffect, useCallback } from 'react'
import { getDevices, getChamberAnalytics } from '../api/client.js'
import { useSSE } from '../api/useSSE.js'
import RiskBar from '../components/analytics/RiskBar.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'

function ChamberSelector({ devices, selected, onChange }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="material-symbols-outlined text-on-surface-variant">door_front</span>
      <select
        className="bg-surface-container border border-outline-variant rounded-md text-body-md text-on-surface px-3 py-2 cursor-pointer min-w-[200px]"
        value={selected || ''}
        onChange={e => onChange(e.target.value)}
      >
        {devices.map(d => (
          <option key={d.id} value={d.id}>{d.chamberName || d.deviceId}</option>
        ))}
      </select>
    </div>
  )
}

function LiveMetric({ label, value, unit, icon, color = 'primary' }) {
  return (
    <div className="glass-card p-4 rounded-xl border border-outline-variant">
      <div className="flex items-center gap-2 mb-2">
        <span className={`material-symbols-outlined text-16px text-${color}`}>{icon}</span>
        <p className="font-label-caps text-9px text-on-surface-variant">{label}</p>
      </div>
      <p className={`text-headline-lg text-${color}`}>
        {value != null ? value : '—'}
        <span className="text-body-sm text-on-surface-variant ml-1">{unit || ''}</span>
      </p>
    </div>
  )
}

function BiologicalRisks({ risks }) {
  if (!risks) return null
  const items = [
    { key: 'condensation', label: 'Condensation / Botrytis', icon: 'water_drop' },
    { key: 'heatStress', label: 'Heat Stress', icon: 'thermostat' },
    { key: 'waterStress', label: 'Water Stress', icon: 'humidity_high' },
  ]
  return (
    <section className="glass-card p-5 rounded-xl border border-outline-variant">
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-error">warning</span>
        <h3 className="font-label-caps text-label-caps text-on-surface-variant">BIOLOGICAL RISKS</h3>
      </div>
      {items.map(item => (
        <RiskBar key={item.key} label={item.label} value={risks[item.key] || 0} icon={item.icon} />
      ))}
    </section>
  )
}

function CycleDetail({ cycle }) {
  if (!cycle) {
    return (
      <section className="glass-card p-5 rounded-xl border border-outline-variant">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-on-surface-variant">cyclone</span>
          <h3 className="font-label-caps text-label-caps text-on-surface-variant">ACTIVE CYCLE</h3>
        </div>
        <p className="text-body-md text-on-surface-variant py-4 text-center">No active cycle</p>
      </section>
    )
  }
  return (
    <section className="glass-card p-5 rounded-xl border border-outline-variant">
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-primary">cyclone</span>
        <h3 className="font-label-caps text-label-caps text-on-surface-variant">ACTIVE CYCLE</h3>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between p-2 bg-surface-container-low rounded">
          <span className="font-label-caps text-9px text-on-surface-variant">SPECIES</span>
          <span className="text-data-sm text-on-surface">{cycle.species || '—'}</span>
        </div>
        <div className="flex justify-between p-2 bg-surface-container-low rounded">
          <span className="font-label-caps text-9px text-on-surface-variant">STATUS</span>
          <span className="text-data-sm text-primary">{cycle.status}</span>
        </div>
        <div className="flex justify-between p-2 bg-surface-container-low rounded">
          <span className="font-label-caps text-9px text-on-surface-variant">PHASE</span>
          <span className="text-data-sm text-on-surface">{cycle.currentPhase || '—'}</span>
        </div>
        <div className="flex justify-between p-2 bg-surface-container-low rounded">
          <span className="font-label-caps text-9px text-on-surface-variant">DAYS ELAPSED</span>
          <span className="text-headline-sm text-primary">{cycle.daysElapsed ?? '—'}</span>
        </div>
      </div>
    </section>
  )
}

function Analytics() {
  const [devices, setDevices] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadDevices() {
    try {
      const devs = await getDevices()
      setDevices(devs)
      if (!selectedId && devs[0]) setSelectedId(devs[0].id)
      setError(null)
    } catch (err) {
      setError(err.message || 'Error loading devices')
    } finally {
      setLoading(false)
    }
  }

  async function loadAnalytics(id) {
    if (!id) return
    try {
      const result = await getChamberAnalytics(id)
      setAnalytics(result.data)
      setError(null)
    } catch (err) {
      setError(err.message || 'Error loading analytics')
    }
  }

  useEffect(() => { loadDevices() }, [])
  useEffect(() => { loadAnalytics(selectedId) }, [selectedId])

  useSSE(useCallback((type) => {
    if (type === 'telemetry' || type === 'state') {
      loadAnalytics(selectedId)
    }
  }, [selectedId]))

  if (loading) return <LoadingState message="Loading analytics..." icon="analytics" />
  if (error && !analytics) return <ErrorState message={error} onRetry={loadDevices} />

  const { telemetry, vpd, risks, cycle, chamber, efficiency } = analytics || {}

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-1">Chamber Analytics</h1>
          <p className="text-on-surface-variant text-body-md">VPD, biological risks and live metrics.</p>
        </div>
        {chamber && (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${chamber.status === 'ONLINE' ? 'bg-primary breathing-pulse' : 'bg-outline-variant'}`} />
            <span className={`text-data-sm ${chamber.status === 'ONLINE' ? 'text-primary' : 'text-on-surface-variant'}`}>
              {chamber.status || '—'}
            </span>
          </div>
        )}
      </div>

      {devices.length > 1 && (
        <ChamberSelector devices={devices} selected={selectedId} onChange={setSelectedId} />
      )}

      {analytics ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <LiveMetric label="TEMPERATURE" value={telemetry?.temperature?.value} unit={telemetry?.temperature?.unit} icon="thermostat" color="primary" />
            <LiveMetric label="HUMIDITY" value={telemetry?.humidity?.value} unit={telemetry?.humidity?.unit} icon="water_drop" color="secondary" />
            <LiveMetric label="CO₂" value={telemetry?.co2?.value} unit={telemetry?.co2?.unit} icon="co2" color="tertiary" />
            <LiveMetric label="VPD" value={vpd?.vpd} unit={vpd?.unit} icon="air" color={vpd?.vpd > 1.5 ? 'error' : 'primary'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <BiologicalRisks risks={risks} />

              <section className="glass-card p-5 rounded-xl border border-outline-variant">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-secondary">insights</span>
                  <h3 className="font-label-caps text-label-caps text-on-surface-variant">ENVIRONMENTAL INSIGHTS</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-container-low rounded">
                    <p className="font-label-caps text-9px text-on-surface-variant mb-1">SATURATION DEFICIT</p>
                    <p className="text-headline-md text-on-surface">{vpd?.saturationDeficit ?? '—'}</p>
                    <p className="text-10px text-on-surface-variant">{vpd?.unit}</p>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded">
                    <p className="font-label-caps text-9px text-on-surface-variant mb-1">EFFICIENCY</p>
                    <p className="text-headline-md text-on-surface">{efficiency?.totalDevices ?? '—'}</p>
                    <p className="text-10px text-on-surface-variant">devices • FAE: {efficiency?.faeEnabled ? 'ON' : 'OFF'}</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <CycleDetail cycle={cycle} />

              {risks && (risks.condensation > 50 || risks.heatStress > 50 || risks.waterStress > 50) && (
                <section className="glass-card p-4 rounded-xl border border-error/30 bg-error/5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-error text-18px">priority_high</span>
                    <h3 className="font-label-caps text-10px text-error">ALERT</h3>
                  </div>
                  <p className="text-body-sm text-on-surface">
                    {risks.condensation > 75 && 'High condensation risk — check ventilation. '}
                    {risks.heatStress > 75 && 'Critical heat stress — reduce temperature. '}
                    {risks.waterStress > 75 && 'Severe water stress — increase humidity. '}
                    {(risks.condensation <= 75 && risks.heatStress <= 75 && risks.waterStress <= 75) && 'Elevated risk levels — monitor closely.'}
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-body-md text-on-surface-variant text-center py-12">Select a chamber to view analytics.</p>
      )}
    </div>
  )
}

export default Analytics
