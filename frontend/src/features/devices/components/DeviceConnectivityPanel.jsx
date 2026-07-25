import { useState, useEffect } from 'react'
import { getDeviceConnectivity, setMaintenanceMode } from '../../../api/client'

const STATUS_CONFIG = {
  ONLINE: { color: 'var(--spore-green)', bg: 'rgba(var(--spore-green-rgb),0.1)', border: 'rgba(var(--spore-green-rgb),0.3)', icon: 'wifi', label: 'En línea' },
  DEGRADED: { color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: 'wifi_off', label: 'Degradado' },
  STALE: { color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: 'schedule', label: 'Sin actualizar' },
  OFFLINE: { color: 'var(--error-red)', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: 'wifi_off', label: 'Fuera de línea' },
  MAINTENANCE: { color: 'var(--info)', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', icon: 'build', label: 'Mantenimiento' },
  PROVISIONING: { color: 'var(--outline)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', icon: 'bluetooth', label: 'Aprovisionando' },
  RETIRED: { color: 'var(--outline)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', icon: 'power_off', label: 'Retirado' },
}

function formatTimeAgo(seconds) {
  if (seconds == null) return 'Nunca'
  if (seconds < 5) return 'Hace un momento'
  if (seconds < 60) return `Hace ${seconds}s`
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `Hace ${h}h ${m}m`
}

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
      } catch {}
      if (active) setLoading(false)
    }
    fetch()
    const interval = setInterval(fetch, 10000)
    return () => { active = false; clearInterval(interval) }
  }, [deviceId])

  async function handleToggleMaintenance() {
    if (!health || toggling) return
    setToggling(true)
    try {
      const result = await setMaintenanceMode(deviceId, !health.maintenanceMode)
      setHealth(prev => ({ ...prev, ...result }))
    } catch {}
    setToggling(false)
  }

  if (loading) return <div style={{ padding: '16px', fontSize: '12px', color: 'var(--outline)' }}>Cargando conectividad...</div>
  if (!health) return null

  const cfg = STATUS_CONFIG[health.status] || STATUS_CONFIG.OFFLINE

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
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>CONECTIVIDAD</span>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <MetricBox label="Última transmisión" value={formatTimeAgo(health.secondsSinceLastSeen)} color={cfg.color} />
        <MetricBox label="Intervalo Heartbeat" value={`${health.heartbeatInterval}s`} color="var(--on-surface)" />
        <MetricBox label="Última telemetría" value={health.lastTelemetryAt ? formatTimeAgo(Math.floor((Date.now() - new Date(health.lastTelemetryAt).getTime()) / 1000)) : '—'} color="var(--on-surface-variant)" />
        <MetricBox label="Último ACK" value={health.lastAckAt ? formatTimeAgo(Math.floor((Date.now() - new Date(health.lastAckAt).getTime()) / 1000)) : '—'} color="var(--on-surface-variant)" />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <div style={{ flex: 1, padding: '8px 12px', background: 'var(--surface-container-high)', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Inactivo tras</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--on-surface)', fontWeight: 600 }}>{health.staleThreshold}s</div>
        </div>
        <div style={{ flex: 1, padding: '8px 12px', background: 'var(--surface-container-high)', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Desconectado tras</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--on-surface)', fontWeight: 600 }}>{health.offlineThreshold}s</div>
        </div>
      </div>

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
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
          {health.maintenanceMode ? 'build' : 'build'}
        </span>
        {health.maintenanceMode ? 'SALIR DE MANTENIMIENTO' : 'INGRESAR A MANTENIMIENTO'}
      </button>
    </div>
  )
}
}

function MetricBox({ label, value, color }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--surface-container-high)', borderRadius: '8px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: color || 'var(--on-surface)', fontWeight: 600 }}>{value}</div>
    </div>
  )
}

export default DeviceConnectivityPanel
