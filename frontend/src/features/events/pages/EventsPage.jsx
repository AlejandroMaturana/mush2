import { useState, useEffect, useRef, useCallback } from 'react'
import { getDevices } from '../../../api/client.js'
import { useSSE } from '../../../api/useSSE.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import EmptyState from '../../../shared/components/EmptyState.jsx'
import EntityHeader from '../../../shared/components/EntityHeader.jsx'

const MAX_EVENTS = 300

const EVENT_TYPES = [
  { value: '', label: 'Todos los tipos' },
  { value: 'ack', label: 'ACK' },
  { value: 'state', label: 'Estado' },
  { value: 'telemetry', label: 'Telemetría' },
  { value: 'alarm', label: 'Alarma' },
  { value: 'control_eval', label: 'Eval. de control' },
  { value: 'health', label: 'Salud' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'phase_transition', label: 'Transición de fase' },
  { value: 'device_health', label: 'Salud de dispositivo' },
  { value: 'device_status_changed', label: 'Cambio de estado' },
]

const EVENT_TYPE_COLORS = {
  ack: '#4ade80',
  state: '#60a5fa',
  telemetry: '#a78bfa',
  alarm: '#f87171',
  control_eval: '#fbbf24',
  health: '#22d3ee',
  maintenance: '#fb923c',
  phase_transition: '#c084fc',
  device_health: '#34d399',
  device_status_changed: '#94a3b8',
}

const EVENT_TYPE_LABELS = Object.fromEntries(EVENT_TYPES.map(t => [t.value, t.label]))

// Normalizador: desacopla la UI de los payloads crudos del stream SSE.
// Formato de salida: { id, type, timestamp, deviceId, severity, message, metadata }
function normalizeEvent(type, data, id) {
  const timestamp = data?.timestamp || new Date().toISOString()
  const base = {
    id,
    type,
    timestamp,
    deviceId: data?.deviceId || null,
    severity: data?.severity || null,
    metadata: data || {},
  }

  switch (type) {
    case 'ack': {
      const ch = data?.actuatorState?.channel
      base.message = `ACK ${data?.status || 'ACKED'}${ch != null ? ` · canal ${ch}` : ''}${data?.cmdId ? ` · ${String(data.cmdId).slice(0, 8)}` : ''}`
      break
    }
    case 'state':
      base.message = `Cambio de estado · ${data?.state || JSON.stringify(data) || '—'}`
      break
    case 'telemetry': {
      const s = data?.sensors || {}
      const parts = []
      if (s.temperature != null) parts.push(`${s.temperature.toFixed(1)}°C`)
      if (s.humidity != null) parts.push(`${s.humidity.toFixed(1)}%`)
      if (s.co2 != null) parts.push(`CO₂ ${s.co2} ppm`)
      if (s.voc != null) parts.push(`VOC ${s.voc} ppb`)
      base.message = parts.length > 0 ? parts.join(' · ') : 'Telemetría recibida'
      break
    }
    case 'alarm': {
      const label = data?.resolvedAt ? 'Alarma resuelta' : 'Alarma'
      const sensor = data?.sensorType ? ` · ${data.sensorType}` : ''
      base.message = `${label}${data?.type ? ` ${data.type}` : ''}${sensor}${data?.message ? ` — ${data.message}` : ''}`
      break
    }
    case 'control_eval': {
      const devs = data?.deviations?.length ? data.deviations.join(' | ') : 'sin desviaciones'
      const cmds = data?.actuatorCommands?.length ? ` · ${data.actuatorCommands.length} comando${data.actuatorCommands.length !== 1 ? 's' : ''}` : ''
      base.message = `Eval. de control · fase ${data?.phase || '—'} · ${devs}${cmds}`
      break
    }
    case 'health':
      base.message = `Salud · heap ${data?.freeHeap != null ? `${(data.freeHeap / 1024).toFixed(1)} KB` : '—'} · uptime ${data?.uptime != null ? `${Math.floor(data.uptime)}s` : '—'}`
      break
    case 'maintenance':
      base.message = `Mantenimiento · ${data?.component || '—'} · ${data?.health || '—'}`
      break
    case 'phase_transition':
      base.message = `Transición de fase · ${data?.fromPhase || '—'} → ${data?.toPhase || '—'}`
      break
    case 'device_health': {
      const st = data?.status || {}
      const parts = []
      if (st.connectivity) parts.push(st.connectivity)
      if (st.health) parts.push(st.health)
      if (st.lifecycle) parts.push(st.lifecycle)
      base.message = `${data?.event || 'Salud de dispositivo'}${parts.length ? ` · ${parts.join(' / ')}` : ''}`
      break
    }
    case 'device_status_changed': {
      const st = data?.status || {}
      const parts = []
      if (st.connectivity) parts.push(`conectividad ${st.connectivity}`)
      if (st.health) parts.push(`salud ${st.health}`)
      if (st.lifecycle) parts.push(st.lifecycle)
      base.message = `Cambio de estado del dispositivo${parts.length ? ` · ${parts.join(' / ')}` : ''}`
      break
    }
    default:
      base.message = data?.message || JSON.stringify(data) || '—'
  }

  return base
}

function Events() {
  const [events, setEvents] = useState([])
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState(false)
  const [includeTelemetry, setIncludeTelemetry] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [deviceFilter, setDeviceFilter] = useState('')

  const pausedRef = useRef(false)
  const includeTelemetryRef = useRef(false)
  const nextIdRef = useRef(1)

  useEffect(() => {
    let cancelled = false
    getDevices()
      .then(devs => { if (!cancelled) setDevices(devs) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useSSE(useCallback((type, data) => {
    if (type === 'connected') {
      setConnected(true)
      return
    }
    setConnected(true)
    if (pausedRef.current) return
    if (type === 'telemetry' && !includeTelemetryRef.current) return
    const ev = normalizeEvent(type, data, nextIdRef.current++)
    setEvents(prev => [ev, ...prev].slice(0, MAX_EVENTS))
  }, []))

  function togglePause() {
    const next = !pausedRef.current
    pausedRef.current = next
    setPaused(next)
  }

  function toggleTelemetry() {
    const next = !includeTelemetryRef.current
    includeTelemetryRef.current = next
    setIncludeTelemetry(next)
  }

  function clearFeed() {
    setEvents([])
  }

  if (loading) return <LoadingState message="Conectando al stream de eventos..." icon="history" />

  const deviceName = (deviceId) => {
    if (!deviceId) return '—'
    const dev = devices.find(d => d.deviceId === deviceId)
    return dev?.chamberName || dev?.deviceId || deviceId
  }

  const filtered = events.filter(ev => {
    if (typeFilter && ev.type !== typeFilter) return false
    if (deviceFilter && ev.deviceId && ev.deviceId !== deviceFilter) return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <EntityHeader
        title="Eventos del sistema"
        subtitle={`Feed operacional en vivo · ${filtered.length} evento${filtered.length !== 1 ? 's' : ''} en el buffer (máx. ${MAX_EVENTS})`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? 'var(--spore-green)' : 'var(--outline)', boxShadow: connected ? '0 0 8px var(--spore-green)' : 'none' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: connected ? 'var(--spore-green)' : 'var(--outline)' }}>
              {connected ? (paused ? 'PAUSADO' : 'EN VIVO') : 'CONECTANDO'}
            </span>
          </div>
        }
      />

      {error && (
        <div className="alert-banner alert-banner-error">
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="form-select" style={{ fontSize: '11px' }}>
          {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={deviceFilter} onChange={e => setDeviceFilter(e.target.value)} className="form-select" style={{ fontSize: '11px' }}>
          <option value="">Todos los dispositivos</option>
          {devices.map(d => <option key={d.id} value={d.deviceId}>{d.chamberName || d.deviceId}</option>)}
        </select>
        <button className={`btn ${paused ? 'btn-glow' : 'btn-secondary'}`} style={{ fontSize: '10px' }} onClick={togglePause}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{paused ? 'play_arrow' : 'pause'}</span>
          {paused ? 'REANUDAR' : 'PAUSAR'}
        </button>
        <button className="btn btn-secondary" style={{ fontSize: '10px' }} onClick={toggleTelemetry}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{includeTelemetry ? 'toggle_on' : 'toggle_off'}</span>
          TELEMETRÍA {includeTelemetry ? 'ON' : 'OFF'}
        </button>
        <button className="btn btn-secondary" style={{ fontSize: '10px' }} onClick={clearFeed} disabled={events.length === 0}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>clear_all</span>
          LIMPIAR
        </button>
      </div>

      {!connected && (
        <div className="alert-banner" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--amber)' }}>sensors</span>
          <span style={{ fontSize: '12px', color: 'var(--amber)', fontWeight: 600 }}>Esperando conexión con el stream de eventos...</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon="history"
          title={events.length === 0 ? 'Sin eventos' : 'Sin coincidencias'}
          message={events.length === 0
            ? 'El feed se llena en tiempo real con la actividad del sistema y los dispositivos.'
            : 'Ningún evento del buffer coincide con los filtros.'}
        />
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Marca de tiempo</th>
                  <th>Tipo</th>
                  <th>Severidad</th>
                  <th>Dispositivo</th>
                  <th>Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ev => {
                  const color = EVENT_TYPE_COLORS[ev.type] || 'var(--outline)'
                  return (
                    <tr key={ev.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>
                        {new Date(ev.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                          {EVENT_TYPE_LABELS[ev.type] || ev.type}
                        </span>
                      </td>
                      <td style={{ fontSize: '11px', color: ev.severity === 'CRITICAL' ? 'var(--error-red)' : ev.severity === 'HIGH' ? 'var(--amber)' : 'var(--on-surface-variant)' }}>
                        {ev.severity || '—'}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--on-surface)' }}>
                        {deviceName(ev.deviceId)}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--on-surface-variant)', maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.message}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Events
