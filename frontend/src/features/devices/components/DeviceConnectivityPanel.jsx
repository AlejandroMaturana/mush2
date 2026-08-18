import { useState, useEffect, useCallback } from 'react'
import { getDeviceConnectivity, setMaintenanceMode } from '../../../api/client'
import { getPrimaryStatus, CONNECTIVITY_CONFIG, HEALTH_CONFIG, LIFECYCLE_CONFIG } from '../../../shared/constants/deviceStatus.js'
import { formatTimeAgo } from '../../../shared/utils/format.js'
import { useSSE } from '../../../api/useSSE'

function DeviceConnectivityPanel({ deviceId }) {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

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

  useSSE(useCallback((type, data) => {
    if (type === 'device_status_changed' && data.deviceId === deviceId) {
      setHealth(prev => prev ? { ...prev, status: data.status, secondsSinceLastSeen: data.secondsSinceLastSeen } : prev)
    }
  }, [deviceId]))

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

  const status = health.status
  const primary = getPrimaryStatus(status)
  const cfg = primary.config
  const connCfg = status?.connectivity ? CONNECTIVITY_CONFIG[status.connectivity] : null
  const healthCfg = status?.health ? HEALTH_CONFIG[status.health] : null

  return (
    <div style={{
      background: 'var(--surface-container)',
      borderRadius: '12px',
      border: `1px solid ${cfg.border}`,
      padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: cfg.color }}>{cfg.icon}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>ESTADO DEL DISPOSITIVO</span>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '3px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
          border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color,
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color }} />
          {cfg.label}
        </span>
      </div>

      {/* Dimension breakdown */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {status?.lifecycle && (
          <DimensionChip label="Ciclo de vida" value={LIFECYCLE_CONFIG[status.lifecycle]?.label || status.lifecycle} color={LIFECYCLE_CONFIG[status.lifecycle]?.color} />
        )}
        {connCfg && (
          <DimensionChip label="Conectividad" value={connCfg.label} color={connCfg.color} />
        )}
        {healthCfg && (
          <DimensionChip label="Salud" value={healthCfg.label} color={healthCfg.color} />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <MetricBox label="Última transmisión" value={formatTimeAgo(health.secondsSinceLastSeen)} color={cfg.color} />
        <MetricBox label="Intervalo Heartbeat" value={`${health.heartbeatInterval}s`} color="var(--on-surface)" />
        <MetricBox label="Última telemetría" value={health.lastTelemetryAt ? formatTimeAgo(Math.floor((Date.now() - new Date(health.lastTelemetryAt).getTime()) / 1000)) : '—'} color="var(--on-surface-variant)" />
        <MetricBox label="Último ACK" value={health.lastAckAt ? formatTimeAgo(Math.floor((Date.now() - new Date(health.lastAckAt).getTime()) / 1000)) : '—'} color="var(--on-surface-variant)" />
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

      {/* Diagnostics */}
      {health.diagnostics && (
        <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'var(--surface-container-high)', borderRadius: '8px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Diagnósticos</div>
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

function DimensionChip({ label, value, color }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', borderRadius: '6px',
      background: 'var(--surface-container-high)',
      border: '1px solid var(--outline-variant)',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: color || 'var(--on-surface)' }}>{value}</span>
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
