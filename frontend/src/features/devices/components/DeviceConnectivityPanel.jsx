import { useState, useEffect, useCallback } from 'react'
import { getDeviceConnectivity, setMaintenanceMode } from '../../../api/client'
import CameraStatus, { PRIMARY_STATUS_CONFIG } from '../../../shared/components/CameraStatus.jsx'
import { formatTimeAgo } from '../../../shared/utils/format.js'
import { useSSE } from '../../../api/useSSE'

function DeviceConnectivityPanel({ deviceId }) {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [showExpert, setShowExpert] = useState(false)

  useEffect(() => {
    let active = true
    async function fetch() {
      try {
        const data = await getDeviceConnectivity(deviceId)
        if (active) setHealth(data)
      } catch (err) {
        console.error('Failed to fetch device connectivity:', err)
      }
      if (active) setLoading(false)
    }
    fetch()
    return () => { active = false }
  }, [deviceId])

  // El estado derivado (primaryStatus) vive en backend (D2). Ante un cambio
  // de estado publicamos solo `status`; re-fetch para obtener el derivado
  // correcto SIN recomputar la precedencia en frontend.
  const refresh = useCallback(async () => {
    try {
      const data = await getDeviceConnectivity(deviceId)
      setHealth(data)
    } catch (err) {
      console.error('Failed to refresh device connectivity:', err)
    }
  }, [deviceId])

  useSSE(useCallback((type, data) => {
    if (type === 'device_status_changed' && data.deviceId === deviceId) {
      refresh()
    }
  }, [deviceId, refresh]))

  async function handleToggleMaintenance() {
    if (!health || toggling) return
    setToggling(true)
    try {
      const result = await setMaintenanceMode(deviceId, !health.maintenanceMode)
      setHealth(prev => ({ ...prev, ...result }))
    } catch (err) { console.error('Failed to toggle maintenance mode:', err) }
    setToggling(false)
  }

  if (loading) return <div style={{ padding: '16px', fontSize: '12px', color: 'var(--outline)' }}>Cargando conectividad...</div>
  if (!health) return null

  const cfg = PRIMARY_STATUS_CONFIG[health.primaryStatus] || PRIMARY_STATUS_CONFIG['DATOS_NO_DISPONIBLES']

  return (
    <div style={{
      background: 'var(--surface-container)',
      borderRadius: '12px',
      border: `1px solid ${cfg.color}`,
      padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: cfg.color }}>{cfg.icon}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>ESTADO DEL DISPOSITIVO</span>
        </div>
      </div>

      {/* Lectura principal + desglose por ejes + última transmisión (D2) */}
      <CameraStatus
        primaryStatus={health.primaryStatus}
        primaryLabel={health.primaryLabel}
        primaryReason={health.primaryReason}
        secondaryStates={health.secondaryStates}
        lastTransmission={health.lastTransmission}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '16px 0' }}>
        <MetricBox label="Intervalo Heartbeat" value={`${health.heartbeatInterval}s`} color="var(--on-surface)" />
        <MetricBox label="Última telemetría" value={health.lastTelemetryAt ? formatTimeAgo(Math.floor((Date.now() - new Date(health.lastTelemetryAt).getTime()) / 1000)) : '—'} color="var(--on-surface-variant)" />
        <MetricBox label="Último ACK" value={health.lastAckAt ? formatTimeAgo(Math.floor((Date.now() - new Date(health.lastAckAt).getTime()) / 1000)) : '—'} color="var(--on-surface-variant)" />
        <MetricBox label="Última transmisión" value={formatTimeAgo(health.secondsSinceLastSeen)} color="var(--on-surface)" />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <div style={{ flex: 1, padding: '8px 12px', background: 'var(--surface-container-high)', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Degradado tras</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--on-surface)', fontWeight: 600 }}>{health.degradedThreshold}s</div>
        </div>
        <div style={{ flex: 1, padding: '8px 12px', background: 'var(--surface-container-high)', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Desconectado tras</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--on-surface)', fontWeight: 600 }}>{health.offlineThreshold}s</div>
        </div>
      </div>

      {/* Vista experta (Progressive Disclosure, M0.2 §11) — diagnóstico técnico */}
      {health.diagnostics && (
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={() => setShowExpert(v => !v)}
            aria-expanded={showExpert}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)',
              background: 'transparent', color: 'var(--on-surface-variant)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{showExpert ? 'expand_less' : 'expand_more'}</span>
              Vista experta · diagnóstico
            </span>
          </button>
          {showExpert && (
            <div style={{ marginTop: '8px', padding: '10px 12px', background: 'var(--surface-container-high)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <DiagChip label="I2C" ok={health.diagnostics.i2c === 'OK'} />
                <DiagChip label="AHT21" ok={health.diagnostics.sensorAht21 === 'OK'} />
                <DiagChip label="ENS160" ok={health.diagnostics.sensorEns160 === 'OK'} />
                <DiagChip label="Heartbeats" ok={health.diagnostics.heartbeatsHealthy} />
                <DiagChip label="Boot Test" ok={health.diagnostics.bootTestPassed} />
                {health.diagnostics.freeHeap != null && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--on-surface-variant)' }}>
                    Heap: {health.diagnostics.freeHeap}B
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleToggleMaintenance}
        disabled={toggling}
        style={{
          width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid',
          borderColor: health.maintenanceMode ? 'rgba(59,130,246,0.3)' : 'var(--outline-variant)',
          background: health.maintenanceMode ? 'rgba(59,130,246,0.1)' : 'transparent',
          color: health.maintenanceMode ? 'var(--info)' : 'var(--on-surface-variant)',
          fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', cursor: toggling ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>build</span>
        {health.maintenanceMode ? 'SALIR DE MANTENIMIENTO' : 'INGRESAR A MANTENIMIENTO'}
      </button>
    </div>
  )
}

function MetricBox({ label, value, color }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--surface-container-high)', borderRadius: '8px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: color || 'var(--on-surface)', fontWeight: 600 }}>{value}</div>
    </div>
  )
}

function DiagChip({ label, ok }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: '10px',
      color: ok ? 'var(--spore-green)' : 'var(--error-red)',
      fontWeight: 600,
    }}>
      {label}: {ok ? 'OK' : 'FAIL'}
    </span>
  )
}

export default DeviceConnectivityPanel
