import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDevice, getActuators, setActuatorDirect, getLatestTelemetry, getTelegramDeviceConfig, updateTelegramDeviceConfig, deleteDevice } from '../../../api/client.js'
import { useSSE } from '../../../api/useSSE.js'
import DomeGauge from '../../../shared/components/DomeGauge.jsx'
import ChartPanel from '../../../shared/components/ChartPanel.jsx'
import StatusBadge from '../../../shared/components/StatusBadge.jsx'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import ErrorState from '../../../shared/components/ErrorState.jsx'
import EmptyState from '../../../shared/components/EmptyState.jsx'
import EntityHeader from '../../../shared/components/EntityHeader.jsx'
import Panel from '../../../shared/components/Panel.jsx'
import EventFeed from '../../../shared/components/EventFeed.jsx'
import PropertiesPanel from '../../../shared/components/PropertiesPanel.jsx'
import ActuatorControl from '../components/ActuatorControl.jsx'
import DeviceConnectivityPanel from '../components/DeviceConnectivityPanel.jsx'

const SENSOR_CFG = {
  temp: { label: 'Temperatura', unit: '°C', min: 18, max: 35, optMin: 22, optMax: 28, decimals: 1, chartColor: '#f59e0b' },
  hum: { label: 'Humedad', unit: '%RH', min: 50, max: 100, optMin: 70, optMax: 90, decimals: 1, chartColor: '#38bdf8' },
  eco2: { label: 'eCO₂', unit: 'ppm', min: 400, max: 5000, optMin: 800, optMax: 2000, decimals: 0, chartColor: '#a78bfa' },
  tvoc: { label: 'TVOC', unit: 'ppb', min: 0, max: 2000, optMin: 0, optMax: 500, decimals: 0, chartColor: '#fb7185' },
}

function DeviceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [telemetry, setTelemetry] = useState({})
  const [actuators, setActuators] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [logs, setLogs] = useState([])
  const [cmdHistory, setCmdHistory] = useState([])
  const [pendingChannels, setPendingChannels] = useState(new Set())
  const [tgConfig, setTgConfig] = useState(null)
  const [tgSaving, setTgSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const prevTelemetry = useRef({})
  const sparkHistory = useRef({ temp: [], hum: [], eco2: [], tvoc: [] })
  const cancelledRef = useRef(false)

  const addLog = useCallback((text, type = 'info') => {
    const ts = new Date().toLocaleTimeString('es-ES', { hour12: false })
    setLogs(prev => [{ ts, text, type }, ...prev].slice(0, 10))
  }, [])

  async function loadData() {
    try {
      const [dev, acts] = await Promise.all([getDevice(id), getActuators(id)])
      if (cancelledRef.current) return
      setDevice(dev)
      setActuators(acts)
      setError(null)
      addLog('Sistema inicializado. Telemetría de cámara activa.', 'success')

      getTelegramDeviceConfig(id).then(cfg => {
        if (!cancelledRef.current) setTgConfig(cfg)
      }).catch(() => {})

      const latest = await getLatestTelemetry(id)
      if (!cancelledRef.current && latest?.temperature != null) {
        applyTelemetry(latest, true)
      }
    } catch (err) {
      if (!cancelledRef.current) setError(err.message || 'Error de conexión')
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }

  const syncState = useCallback(async () => {
    try {
      const [dev, acts] = await Promise.all([getDevice(id), getActuators(id)])
      if (cancelledRef.current) return
      if (dev) setDevice(dev)
      setActuators(acts)
      setError(null)
    } catch {}
  }, [id])

  function applyTelemetry(sensors, initial = false) {
    if (!sensors) return
    const prev = prevTelemetry.current
    if (!initial) {
      if (sensors.temperature != null && prev.temperature != null && Math.abs(sensors.temperature - prev.temperature) > 0.2) {
        addLog(`Temperatura ${sensors.temperature > prev.temperature ? '▲' : '▼'} ${sensors.temperature.toFixed(1)}°C`, 'info')
      }
      if (sensors.humidity != null && prev.humidity != null && Math.abs(sensors.humidity - prev.humidity) > 1) {
        addLog(`Humedad ${sensors.humidity > prev.humidity ? '▲' : '▼'} ${sensors.humidity.toFixed(0)}%`, 'info')
      }
      if (sensors.co2 != null && prev.co2 != null && Math.abs(sensors.co2 - prev.co2) > 50) {
        const warnLevel = sensors.co2 > 2000 ? 'error' : sensors.co2 > 1500 ? 'warn' : 'info'
        addLog(`CO₂ ${sensors.co2 > prev.co2 ? '▲' : '▼'} ${sensors.co2} ppm`, warnLevel)
      }
      prevTelemetry.current = {
        temperature: sensors.temperature ?? prev.temperature,
        humidity: sensors.humidity ?? prev.humidity,
        co2: sensors.co2 ?? prev.co2,
      }
    }
    setTelemetry(prev => ({
      ...prev,
      temperature: sensors.temperature ?? prev.temperature,
      humidity: sensors.humidity ?? prev.humidity,
      co2: sensors.co2 ?? prev.co2,
      voc: sensors.voc ?? prev.voc,
      ts: new Date().toISOString(),
    }))
    if (!initial) pushHistory(sensors)
  }

  function pushHistory(sensors) {
    for (const sk of ['temp', 'hum', 'eco2', 'tvoc']) {
      const skey = sk === 'eco2' ? 'co2' : sk === 'tvoc' ? 'voc' : sk
      const v = sensors[skey]
      if (v != null) {
        const sh = sparkHistory.current[sk]
        sh.push(v)
        if (sh.length > 12) sh.shift()
      }
    }
  }

  useEffect(() => {
    cancelledRef.current = false
    loadData()
    return () => { cancelledRef.current = true }
  }, [id, addLog])

  useSSE(useCallback((type, data) => {
    if (type === 'connected') {
      syncState()
      return
    }
    if (type === 'telemetry' && device && data.deviceId === device.deviceId) {
      if (data.sensors) {
        applyTelemetry(data.sensors)
      }
    }
    if (type === 'ack' && device && data.deviceId === device.deviceId) {
      const ch = data.actuatorState?.channel
      if (ch == null) return
      const raw = data.actuatorState.state
      const state = raw === 'ON' || raw === true || raw === 1 ? 'ON' : 'OFF'
      const lastAck = data.status === 'TIMEOUT' ? 'TIMEOUT' : 'ACKED'
      setActuators(prev => prev.map(a =>
        a.channel === ch ? { ...a, state, lastAck } : a
      ))
      setPendingChannels(prev => {
        const next = new Set(prev)
        next.delete(ch)
        return next
      })
      const label = actuators.find(a => a.channel === ch)?.label || `CANAL ${ch}`
      if (lastAck === 'ACKED') {
        addLog(`${label} → CONFIRMADO (${state})`, 'success')
      } else {
        addLog(`${label} → TIEMPO AGOTADO`, 'error')
      }
    }
    if (type === 'control_eval' && device && data.deviceId === device.deviceId && Array.isArray(data.actuatorCommands)) {
      setActuators(prev => prev.map(a => {
        const cmd = data.actuatorCommands.find(c => c.channel === a.channel)
        return cmd ? { ...a, state: cmd.command === 'ON' ? 'ON' : 'OFF' } : a
      }))
    }
    if (type === 'device_status_changed' && device && data.deviceId === device.deviceId) {
      if (data.status?.connectivity === 'ONLINE' && data.previousStatus?.connectivity !== 'ONLINE') {
        syncState()
      }
    }
  }, [device, actuators, addLog, syncState]))

  function getCmdState(act) {
    if (pendingChannels.has(act.channel)) return 'PENDING'
    if (act.lastAck === 'ACKED') return 'ACKED'
    if (act.lastAck === 'TIMEOUT') return 'TIMEOUT'
    return null
  }

  async function handleToggle(channel) {
    const act = actuators.find(a => a.channel === channel)
    const newState = !act || act.state === 'OFF' ? 'ON' : 'OFF'
    const label = act?.label || `CANAL ${channel}`
    setPendingChannels(prev => new Set([...prev, channel]))
    addLog(`${label} → COMANDO ${newState === 'ON' ? 'ENCENDER' : 'APAGAR'}`, 'warn')
    setCmdHistory(prev => [{
      channel,
      label,
      cmd: newState,
      ts: new Date().toLocaleTimeString('es-ES', { hour12: false }),
      status: 'PENDING',
    }, ...prev].slice(0, 8))
    try {
      await setActuatorDirect(device.deviceId, channel, newState)
      setActuators(prev => prev.map(a =>
        a.channel === channel ? { ...a, state: newState } : a
      ))
      setPendingChannels(prev => {
        const next = new Set(prev)
        next.delete(channel)
        return next
      })
      setCmdHistory(prev => prev.map(h =>
        h.channel === channel && h.status === 'PENDING'
          ? { ...h, status: 'SENT' }
          : h
      ))
    } catch (err) {
      setPendingChannels(prev => {
        const next = new Set(prev)
        next.delete(channel)
        return next
      })
      addLog(`${label} → ERROR: ${err.response?.data?.error || 'tiempo agotado'}`, 'error')
      setCmdHistory(prev => prev.map(h =>
        h.channel === channel && h.status === 'PENDING'
          ? { ...h, status: 'FAILED' }
          : h
      ))
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteDevice(id)
      navigate('/fleet/devices')
    } catch (err) {
      setError(err.message || 'Error al eliminar el dispositivo')
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) return <LoadingState message="Conectando con el dispositivo..." icon="sync" />
  if (error) return <ErrorState message={error} onRetry={loadData} />

  if (!device) return (
    <EmptyState
      icon="sensors_off"
      title="Dispositivo no encontrado"
      message="El dispositivo consultado no existe o ha sido retirado."
    />
  )

  const isOnline = device.status?.connectivity === 'ONLINE'
  const isStale = device.status?.connectivity === 'DEGRADED'
  const isMaintenance = device.status?.lifecycle === 'MAINTENANCE'
  const has = {
    temp: telemetry.temperature != null,
    hum: telemetry.humidity != null,
    eco2: telemetry.co2 != null,
    tvoc: telemetry.voc != null,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <button
        onClick={() => navigate('/overview')}
        className="btn btn-ghost"
        style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: '11px' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
        VOLVER AL PANEL DE CONTROL
      </button>

      <EntityHeader
        title={device.chamberName || device.deviceId}
        subtitle={`${device.hwRevision ? `HW ${device.hwRevision} · ` : ''}Firmware ${device.firmwareVersion} · ${device.macAddress || 'MAC —'}${device.secondsSinceLastSeen != null ? ` · Última transmisión ${device.secondsSinceLastSeen < 5 ? 'hace un momento' : device.secondsSinceLastSeen < 60 ? `hace ${device.secondsSinceLastSeen}s` : `hace ${Math.floor(device.secondsSinceLastSeen / 60)}m`}` : ''}`}
        badge={device.status?.lifecycle || 'ACTIVE'}
        badgeVariant={isOnline ? 'online' : isMaintenance ? 'info' : isStale ? 'warning' : 'critical'}
        actions={
          <button onClick={() => setShowDeleteModal(true)} className="btn btn-danger" style={{ fontSize: '11px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
            ELIMINAR
          </button>
        }
      />

      <PropertiesPanel
        title="Propiedades del dispositivo"
        properties={[
          { icon: 'memory', label: 'ID Dispositivo', value: device.deviceId },
          { icon: 'developer_board', label: 'Firmware', value: device.firmwareVersion || '—' },
          { icon: 'hardware', label: 'Rev. Hardware', value: device.hwRevision || '—' },
          { icon: 'wifi', label: 'Dirección MAC', value: device.macAddress || '—' },
          { icon: 'schedule', label: 'Última transmisión', value: device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Nunca' },
          { icon: 'dns', label: 'Dirección IP', value: device.ipAddress || '—' },
          { icon: 'speed', label: 'RSSI', value: device.rssi ? `${device.rssi} dBm` : '—' },
          { icon: 'replay', label: 'Reinicios', value: device.rebootCount ?? '—' },
        ]}
      />

      <DeviceConnectivityPanel deviceId={id} />

      {/* Telemetry + System Log */}
      <div className="device-dash-grid">
        <Panel title="TELEMETRÍA" subtitle="Datos de sensores en tiempo real" className="device-dash-panel">
          <div className="device-gauge-grid">
            <DomeGauge value={has.temp ? telemetry.temperature : SENSOR_CFG.temp.min} prevValue={telemetry.temperature} min={SENSOR_CFG.temp.min} max={SENSOR_CFG.temp.max} optMin={SENSOR_CFG.temp.optMin} optMax={SENSOR_CFG.temp.optMax} unit={SENSOR_CFG.temp.unit} label={SENSOR_CFG.temp.label} decimals={SENSOR_CFG.temp.decimals} history={sparkHistory.current.temp} noData={!has.temp} />
            <DomeGauge value={has.hum ? telemetry.humidity : SENSOR_CFG.hum.min} prevValue={telemetry.humidity} min={SENSOR_CFG.hum.min} max={SENSOR_CFG.hum.max} optMin={SENSOR_CFG.hum.optMin} optMax={SENSOR_CFG.hum.optMax} unit={SENSOR_CFG.hum.unit} label={SENSOR_CFG.hum.label} decimals={SENSOR_CFG.hum.decimals} history={sparkHistory.current.hum} noData={!has.hum} />
            <DomeGauge value={has.eco2 ? telemetry.co2 : SENSOR_CFG.eco2.min} prevValue={telemetry.co2} min={SENSOR_CFG.eco2.min} max={SENSOR_CFG.eco2.max} optMin={SENSOR_CFG.eco2.optMin} optMax={SENSOR_CFG.eco2.optMax} unit={SENSOR_CFG.eco2.unit} label={SENSOR_CFG.eco2.label} decimals={SENSOR_CFG.eco2.decimals} history={sparkHistory.current.eco2} noData={!has.eco2} />
            <DomeGauge value={has.tvoc ? telemetry.voc : SENSOR_CFG.tvoc.min} prevValue={telemetry.voc} min={SENSOR_CFG.tvoc.min} max={SENSOR_CFG.tvoc.max} optMin={SENSOR_CFG.tvoc.optMin} optMax={SENSOR_CFG.tvoc.optMax} unit={SENSOR_CFG.tvoc.unit} label={SENSOR_CFG.tvoc.label} decimals={SENSOR_CFG.tvoc.decimals} history={sparkHistory.current.tvoc} noData={!has.tvoc} />
          </div>
        </Panel>

        <Panel title="REGISTRO DE EVENTOS" subtitle="Bitácora en tiempo real" className="device-dash-panel device-dash-log">
          <div className="device-log-scroll">
            <EventFeed
              events={logs.map((entry, i) => ({
                id: i,
                message: entry.text,
                time: entry.ts,
                type: entry.type === 'error' ? 'error' : entry.type === 'success' ? 'success' : entry.type === 'warn' ? 'warning' : '',
                icon: entry.type === 'error' ? 'error' : entry.type === 'success' ? 'check_circle' : entry.type === 'warn' ? 'warning' : 'info',
              }))}
              emptyMessage="Esperando datos..."
              maxItems={10}
            />
          </div>
        </Panel>
      </div>

      {/* Actuators */}
      <Panel
        title="ACTUADORES"
        subtitle={`MODO: ${actuators.some(a => a.mode === 'REMOTE') ? 'REMOTOS' : 'LOCAL'}`}
        headerActions={
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px solid',
            borderColor: actuators.some(a => a.mode === 'REMOTE') ? 'rgba(107,251,154,0.3)' : 'var(--outline-variant)',
            background: actuators.some(a => a.mode === 'REMOTE') ? 'rgba(107,251,154,0.1)' : 'transparent',
            color: actuators.some(a => a.mode === 'REMOTE') ? 'var(--spore-green)' : 'var(--on-surface-variant)',
          }}>
            {actuators.some(a => a.mode === 'REMOTE') ? 'REMOTOS' : 'LOCAL'}
          </span>
        }
      >
        <div className="grid" style={{ height: '140px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[1, 2, 3, 4].map((ch, idx) => {
            const act = actuators.find(a => a.channel === ch) || { channel: ch, state: 'OFF', mode: 'LOCAL', label: `CANAL ${ch}` }
            return (
              <div key={ch} style={{ borderRight: idx < 3 ? '1px solid var(--outline-variant)' : 'none' }}>
                <ActuatorControl
                  actuator={act}
                  meta={{ label: act.label || `CANAL ${ch}`, icon: 'settings', color: 'primary' }}
                  cmdState={getCmdState(act)}
                  onToggle={handleToggle}
                />
              </div>
            )
          })}
        </div>
        <div className="panel-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--spore-green)', display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--on-surface-variant)' }}>
                {actuators.filter(a => a.lastAck === 'ACKED').length}/{actuators.length} CONFIRMADOS
              </span>
            </div>
            <span style={{ width: '1px', height: '12px', background: 'var(--outline-variant)', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--on-surface-variant)' }}>
              ÚLTIMO: {logs[0] ? `[${logs[0].ts}] ${logs[0].text}` : '--:--:-- esperando...'}
            </span>
          </div>
        </div>
      </Panel>

      {/* Telegram Config */}
      {tgConfig && (
        <Panel title="ALERTAS DE TELEGRAM" subtitle="Configuración de notificaciones push">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--on-surface-variant)' }}>HABILITADO</span>
              <input type="checkbox" className="toggle-checkbox" checked={tgConfig.enabled} onChange={async e => {
                const val = e.target.checked
                setTgConfig(prev => ({ ...prev, enabled: val }))
                setTgSaving(true)
                try { await updateTelegramDeviceConfig(id, { enabled: val }) } catch {}
                setTgSaving(false)
              }} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'block' }}>SEVERIDAD MÍNIMA</label>
              <select className="form-select" value={tgConfig.minSeverity} onChange={async e => {
                const val = e.target.value
                setTgConfig(prev => ({ ...prev, minSeverity: val }))
                setTgSaving(true)
                try { await updateTelegramDeviceConfig(id, { minSeverity: val }) } catch {}
                setTgSaving(false)
              }}>
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              {tgSaving && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)' }}>GUARDANDO...</span>}
            </div>
            {[
              { key: 'alertOnFault', label: 'FALLO DE SENSOR' },
              { key: 'alertOnRange', label: 'FORA DE RANGO' },
              { key: 'alertOnDisconnect', label: 'DESCONEXIÓN' },
              { key: 'alertOnSystem', label: 'ERROR DE SISTEMA' },
            ].map(({ key, label }) => (
              <div key={key} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--surface-container)',
                borderRadius: '8px',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
                <input type="checkbox" className="toggle-checkbox" checked={tgConfig[key]} onChange={async e => {
                  const val = e.target.checked
                  setTgConfig(prev => ({ ...prev, [key]: val }))
                  try { await updateTelegramDeviceConfig(id, { [key]: val }) } catch {}
                }} />
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Chart Panel */}
      <ChartPanel deviceId={id} telemetry={telemetry} has={has} />

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--error-red)' }}>warning</span>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--on-surface)', textAlign: 'center' }}>Eliminar dispositivo</h2>
              <p style={{ fontSize: '13px', color: 'var(--outline)', textAlign: 'center', lineHeight: 1.5 }}>
                ¿Está seguro de que desea eliminar <strong style={{ color: 'var(--on-surface)' }}>{device.chamberName || device.deviceId}</strong>?
                Esta acción eliminará todos los datos asociados, incluyendo ciclos, telemetría e historial de actuadores. Esta acción no se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px' }}>
                <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="btn btn-secondary" style={{ flex: 1, fontSize: '12px' }}>Cancelar</button>
                <button onClick={handleDelete} disabled={deleting} className="btn btn-danger" style={{ flex: 1, fontSize: '12px' }}>
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeviceDetail
