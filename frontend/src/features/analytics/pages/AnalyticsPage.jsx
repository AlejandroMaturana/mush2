import { useState, useEffect, useCallback } from 'react'
import { getDevices, getChamberAnalytics } from '../../../api/client.js'
import { useSSE } from '../../../api/useSSE.js'
import RiskBar from '../components/RiskBar.jsx'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import { getPrimaryStatus } from '../../../shared/constants/deviceStatus.js'

const METRIC_CONFIG = {
  temperature: { label: 'TEMPERATURA', icon: 'thermostat', color: 'var(--spore-green)' },
  humidity: { label: 'HUMEDAD', icon: 'water_drop', color: 'var(--accent-blue, #60a5fa)' },
  co2: { label: 'CO₂', icon: 'co2', color: 'var(--accent-purple, #a78bfa)' },
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
      setError(err.message || 'Error al cargar los dispositivos')
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
      setError(err.message || 'Error al cargar los datos analíticos')
    }
  }

  useEffect(() => { loadDevices() }, [])
  useEffect(() => { loadAnalytics(selectedId) }, [selectedId])

  useSSE(useCallback((type) => {
    if (type === 'telemetry' || type === 'state') {
      loadAnalytics(selectedId)
    }
  }, [selectedId]))

  if (loading) return <LoadingState message="Cargando datos analíticos..." icon="analytics" />

  const { telemetry, vpd, risks, cycle, chamber, efficiency } = analytics || {}
  const vpdColor = vpd?.vpd > 1.5 ? 'var(--error-red)' : 'var(--spore-green)'
  const hasHighRisk = risks && (risks.condensation > 50 || risks.heatStress > 50 || risks.waterStress > 50)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="gradient-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Análisis de cámara</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--outline)' }}>
            VPD, riesgos biológicos y métricas en tiempo real
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {chamber && (() => {
            const primary = getPrimaryStatus(chamber.status)
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: primary.config.color, boxShadow: primary.config.cssClass === 'online' ? '0 0 8px var(--spore-green)' : 'none' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: primary.config.color }}>
                  {primary.config.label}
                </span>
              </div>
            )
          })()}
          {devices.length > 1 && (
            <select
              value={selectedId || ''}
              onChange={e => setSelectedId(e.target.value)}
              className="form-select"
              style={{ fontSize: '11px', minWidth: '180px' }}
            >
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.chamberName || d.deviceId}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert-banner alert-banner-error">
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {analytics ? (
        <>
          {/* Live Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {/* Temp, Humidity, CO2 */}
            {Object.entries(METRIC_CONFIG).map(([key, cfg]) => {
              const t = telemetry?.[key]
              return (
                <div key={key} className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: cfg.color }}>{cfg.icon}</span>
                    <span className="form-label">{cfg.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
                      {t?.value != null ? t.value : '—'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--outline)' }}>{t?.unit || ''}</span>
                  </div>
                </div>
              )
            })}

            {/* VPD */}
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: vpdColor }}>air</span>
                <span className="form-label">VPD</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: vpdColor, lineHeight: 1 }}>
                  {vpd?.vpd ?? '—'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--outline)' }}>{vpd?.unit || ''}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Biological Risks */}
              {risks && (
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
                    <span className="section-label">Riesgos biológicos</span>
                  </div>
                  <RiskBar label="Condensación / Botrytis" value={risks.condensation || 0} icon="water_drop" />
                  <RiskBar label="Estrés térmico" value={risks.heatStress || 0} icon="thermostat" />
                  <RiskBar label="Estrés hídrico" value={risks.waterStress || 0} icon="humidity_high" />
                </div>
              )}

              {/* Environmental Insights */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--accent-blue, #60a5fa)' }}>insights</span>
                  <span className="section-label">Condiciones ambientales</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>
                    <span className="form-label">Déficit de saturación</span>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--on-surface)' }}>{vpd?.saturationDeficit ?? '—'}</span>
                    <span style={{ fontSize: '10px', color: 'var(--outline)', display: 'block' }}>{vpd?.unit}</span>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>
                    <span className="form-label">Eficiencia</span>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--on-surface)' }}>{efficiency?.totalDevices ?? '—'}</span>
                    <span style={{ fontSize: '10px', color: 'var(--outline)', display: 'block' }}>dispositivos · FAE: {efficiency?.faeEnabled ? 'ACTIVO' : 'INACTIVO'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Active Cycle */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--spore-green)' }}>cyclone</span>
                  <span className="section-label">Ciclo activo</span>
                </div>
                {cycle ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { label: 'Especie', value: cycle.species || '—' },
                      { label: 'Estado', value: cycle.status, color: 'var(--spore-green)' },
                      { label: 'Fase', value: cycle.currentPhase || '—' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>
                        <span className="form-label">{item.label}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: item.color || 'var(--on-surface)' }}>{item.value}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>
                      <span className="form-label">Días transcurridos</span>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--spore-green)' }}>{cycle.daysElapsed ?? '—'}</span>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--outline)', textAlign: 'center', padding: '24px 0' }}>Sin ciclo activo</p>
                )}
              </div>

              {/* Alert */}
              {hasHighRisk && (
                <div style={{
                  padding: '16px', borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="material-symbols-outlined pulse-error" style={{ fontSize: '18px', color: 'var(--error-red)' }}>priority_high</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: 'var(--error-red)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Alerta</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--on-surface)', lineHeight: 1.6 }}>
                    {risks.condensation > 75 && 'Riesgo de condensación elevado — revisar ventilación. '}
                    {risks.heatStress > 75 && 'Estrés térmico crítico — reducir temperatura. '}
                    {risks.waterStress > 75 && 'Estrés hídrico severo — aumentar humedad. '}
                    {risks.condensation <= 75 && risks.heatStress <= 75 && risks.waterStress <= 75 && 'Niveles de riesgo elevados — monitorear con atención.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)', marginBottom: '16px', display: 'block' }}>analytics</span>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '8px' }}>Sin cámara seleccionada</h3>
          <p style={{ fontSize: '13px', color: 'var(--outline)' }}>Seleccione una cámara para ver los datos analíticos.</p>
        </div>
      )}
    </div>
  )
}

export default Analytics
