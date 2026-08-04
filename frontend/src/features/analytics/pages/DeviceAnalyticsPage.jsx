import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getChamberAnalytics } from '../../../api/client.js'
import { useSSE } from '../../../api/useSSE.js'
import RiskBar from '../components/RiskBar.jsx'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import EmptyState from '../../../shared/components/EmptyState.jsx'
import { getPrimaryStatus } from '../../../shared/constants/deviceStatus.js'

function DeviceAnalytics() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadAnalytics() {
    if (!id) return
    try {
      const result = await getChamberAnalytics(id)
      setAnalytics(result.data)
      setError(null)
    } catch (err) {
      setError(err.message || 'Error al cargar los datos analíticos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAnalytics() }, [id])

  useSSE(useCallback((type) => {
    if (type === 'telemetry' || type === 'state') {
      loadAnalytics()
    }
  }, [id]))

  if (loading) return <LoadingState message="Cargando análisis del dispositivo..." icon="analytics" />

  const { risks, vpd, chamber, efficiency } = analytics || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <button
        onClick={() => navigate(`/fleet/devices/${id}`)}
        className="btn btn-ghost"
        style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: '11px' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
        VOLVER AL DISPOSITIVO
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="gradient-title" style={{ fontSize: '28px', marginBottom: '4px' }}>
            Análisis del dispositivo
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--outline)' }}>
            {chamber?.name || 'Dispositivo'} · Riesgos biológicos y condiciones ambientales
          </p>
        </div>
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
      </div>

      {error && (
        <div className="alert-banner alert-banner-error">
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {analytics ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
      ) : (
        <EmptyState
          icon="analytics"
          title="Sin datos analíticos"
          message="No hay información analítica disponible para este dispositivo."
        />
      )}
    </div>
  )
}

export default DeviceAnalytics
