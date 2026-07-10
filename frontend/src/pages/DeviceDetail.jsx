import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDevice, getActuators, setActuatorDirect, getLatestTelemetry, getTelegramDeviceConfig, updateTelegramDeviceConfig } from '../api/client.js'
import { useSSE } from '../api/useSSE.js'
import DomeGauge from '../components/ui/DomeGauge.jsx'
import ChartPanel from '../components/ui/ChartPanel.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import ActuatorControl from '../components/device/ActuatorControl.jsx'

const SENSOR_CFG = {
  temp: { label: 'Temperature', unit: '°C', min: 18, max: 35, optMin: 22, optMax: 28, decimals: 1, chartColor: '#f59e0b' },
  hum: { label: 'Humidity', unit: '%RH', min: 50, max: 100, optMin: 70, optMax: 90, decimals: 1, chartColor: '#38bdf8' },
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

  const prevTelemetry = useRef({})
  const sparkHistory = useRef({ temp: [], hum: [], eco2: [], tvoc: [] })
  const cancelledRef = useRef(false)

  const addLog = useCallback((text, type = 'info') => {
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false })
    setLogs(prev => [{ ts, text, type }, ...prev].slice(0, 10))
  }, [])

  async function loadData() {
    try {
      const [dev, acts] = await Promise.all([getDevice(id), getActuators(id)])
      if (cancelledRef.current) return
      setDevice(dev)
      setActuators(acts)
      setError(null)
      addLog('System initialized. Chamber telemetry active.', 'success')

      getTelegramDeviceConfig(id).then(cfg => {
        if (!cancelledRef.current) setTgConfig(cfg)
      }).catch(() => {})

      const latest = await getLatestTelemetry(id)
      if (!cancelledRef.current && latest?.temperature != null) {
        applyTelemetry(latest, true)
      }
    } catch (err) {
      if (!cancelledRef.current) setError(err.message || 'Connection error')
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }

  function applyTelemetry(sensors, initial = false) {
    if (!sensors) return
    const prev = prevTelemetry.current
    if (!initial) {
      if (sensors.temperature != null && prev.temperature != null && Math.abs(sensors.temperature - prev.temperature) > 0.2) {
        addLog(`Temperature ${sensors.temperature > prev.temperature ? '▲' : '▼'} ${sensors.temperature.toFixed(1)}°C`, 'info')
      }
      if (sensors.humidity != null && prev.humidity != null && Math.abs(sensors.humidity - prev.humidity) > 1) {
        addLog(`Humidity ${sensors.humidity > prev.humidity ? '▲' : '▼'} ${sensors.humidity.toFixed(0)}%`, 'info')
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
    if (type === 'telemetry' && device && data.deviceId === device.deviceId) {
      if (data.sensors) {
        applyTelemetry(data.sensors)
      }
    }
    if (type === 'ack') {
      const ch = data.actuatorState?.channel
      setActuators(prev => prev.map(a =>
        a.channel === ch
          ? { ...a, state: data.actuatorState.state, lastAck: data.status }
          : a
      ))
      setPendingChannels(prev => {
        const next = new Set(prev)
        next.delete(ch)
        return next
      })
      const label = actuators.find(a => a.channel === ch)?.label || `CH${ch}`
      if (data.status === 'ACKED') {
        addLog(`${label} → ACKED (${data.actuatorState.state})`, 'success')
      } else if (data.status === 'TIMEOUT') {
        addLog(`${label} → TIMEOUT`, 'error')
      }
    }
  }, [device, actuators, addLog]))

  function getCmdState(act) {
    if (pendingChannels.has(act.channel)) return 'PENDING'
    if (act.lastAck === 'ACKED') return 'ACKED'
    if (act.lastAck === 'TIMEOUT') return 'TIMEOUT'
    return null
  }

  async function handleToggle(channel) {
    const act = actuators.find(a => a.channel === channel)
    const newState = !act || act.state === 'OFF' ? 'ON' : 'OFF'
    const label = act?.label || `CH${channel}`
    setPendingChannels(prev => new Set([...prev, channel]))
    addLog(`${label} → CMD ${newState}`, 'warn')
    setCmdHistory(prev => [{
      channel,
      label,
      cmd: newState,
      ts: new Date().toLocaleTimeString('en-GB', { hour12: false }),
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
      addLog(`${label} → FAILED: ${err.response?.data?.error || 'timeout'}`, 'error')
      setCmdHistory(prev => prev.map(h =>
        h.channel === channel && h.status === 'PENDING'
          ? { ...h, status: 'FAILED' }
          : h
      ))
    }
  }

  if (loading) return <LoadingState message="Connecting to device..." icon="sync" />
  if (error) return <ErrorState message={error} onRetry={loadData} />

  if (!device) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <span className="material-symbols-outlined text-48px text-on-surface-variant mb-4">sensors_off</span>
        <p className="text-body-md text-on-surface-variant">Device not found</p>
      </div>
    </div>
  )

  const isOnline = device.status === 'ONLINE'
  const has = {
    temp: telemetry.temperature != null,
    hum: telemetry.humidity != null,
    eco2: telemetry.co2 != null,
    tvoc: telemetry.voc != null,
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate('/dashboard')}
        className="back-btn"
      >
        <span className="material-symbols-outlined text-16px" style={{ verticalAlign: 'middle', marginRight: '4px' }}>arrow_back</span>
        BACK TO DASHBOARD
      </button>

      <section className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
            <h1 className="text-headline-lg text-on-surface">{device.chamberName || device.deviceId}</h1>
            <StatusBadge status={isOnline ? 'online' : 'critical'} label={isOnline ? 'ONLINE' : device.status} />
          </div>
          <p className="text-body-md text-on-surface-variant" style={{ marginTop: '4px' }}>
            {device.hwRevision ? `HW ${device.hwRevision} · ` : ''}Firmware {device.firmwareVersion} · {device.macAddress || 'MAC —'} · Last seen {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'never'}
          </p>
        </div>
      </section>

      <section className="flex gap-4">
        <div className="flex flex-col" style={{ flex: '1 1 70%', minWidth: 0 }}>
          <div className="chart-panel-label">TELEMETRY</div>
          <div className="flex flex-1">
            <DomeGauge value={has.temp ? telemetry.temperature : SENSOR_CFG.temp.min} prevValue={telemetry.temperature} min={SENSOR_CFG.temp.min} max={SENSOR_CFG.temp.max} optMin={SENSOR_CFG.temp.optMin} optMax={SENSOR_CFG.temp.optMax} unit={SENSOR_CFG.temp.unit} label={SENSOR_CFG.temp.label} decimals={SENSOR_CFG.temp.decimals} history={sparkHistory.current.temp} noData={!has.temp} />
            <DomeGauge value={has.hum ? telemetry.humidity : SENSOR_CFG.hum.min} prevValue={telemetry.humidity} min={SENSOR_CFG.hum.min} max={SENSOR_CFG.hum.max} optMin={SENSOR_CFG.hum.optMin} optMax={SENSOR_CFG.hum.optMax} unit={SENSOR_CFG.hum.unit} label={SENSOR_CFG.hum.label} decimals={SENSOR_CFG.hum.decimals} history={sparkHistory.current.hum} noData={!has.hum} />
            <DomeGauge value={has.eco2 ? telemetry.co2 : SENSOR_CFG.eco2.min} prevValue={telemetry.co2} min={SENSOR_CFG.eco2.min} max={SENSOR_CFG.eco2.max} optMin={SENSOR_CFG.eco2.optMin} optMax={SENSOR_CFG.eco2.optMax} unit={SENSOR_CFG.eco2.unit} label={SENSOR_CFG.eco2.label} decimals={SENSOR_CFG.eco2.decimals} history={sparkHistory.current.eco2} noData={!has.eco2} />
            <DomeGauge value={has.tvoc ? telemetry.voc : SENSOR_CFG.tvoc.min} prevValue={telemetry.voc} min={SENSOR_CFG.tvoc.min} max={SENSOR_CFG.tvoc.max} optMin={SENSOR_CFG.tvoc.optMin} optMax={SENSOR_CFG.tvoc.optMax} unit={SENSOR_CFG.tvoc.unit} label={SENSOR_CFG.tvoc.label} decimals={SENSOR_CFG.tvoc.decimals} history={sparkHistory.current.tvoc} noData={!has.tvoc} />
          </div>
        </div>
        <div className="bg-surface-container border border-outline-variant flex flex-col" style={{ flex: '1 1 30%', minWidth: 0, borderRadius: '8px' }}>
          <div className="flex items-center justify-between" style={{ padding: '8px 12px', borderBottom: '1px solid var(--outline-variant)' }}>
            <span className="chart-panel-label">SYSTEM LOG</span>
            <span className="text-8px text-primary bg-primary/10" style={{ padding: '2px 6px', borderRadius: '4px' }}>LIVE</span>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ padding: '4px 8px', fontSize: '10px', fontFamily: 'var(--font-mono)', lineHeight: '1.25' }}>
            {logs.length === 0 && (
              <div className="opacity-30" style={{ padding: '4px' }}>[--:--:--] Waiting for data...</div>
            )}
            {logs.map((entry, i) => (
              <div key={i} className="flex gap-2" style={{ padding: '1px 0', opacity: i === 0 ? 1 : 0.6 }}>
                <span className="text-outline shrink-0">{entry.ts}</span>
                <span className={
                  entry.type === 'error' ? 'text-error' :
                  entry.type === 'success' ? 'text-primary' :
                  entry.type === 'warn' ? 'text-tertiary' :
                  'text-on-surface-variant'
                }>{entry.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-surface-container-low border" style={{ borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderColor: 'var(--outline-variant)' }}>
        <div style={{ background: 'rgba(49,54,51,0.3)', padding: '8px 12px', borderBottom: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">grid_view</span>
            <span className="chart-panel-label">ACTUATORS</span>
          </div>
          <div className="flex items-center gap-3">
            <span style={{
              fontSize: '7px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: actuators.some(a => a.mode === 'REMOTE') ? 'rgba(107,251,154,0.2)' : 'var(--outline-variant)',
              background: actuators.some(a => a.mode === 'REMOTE') ? 'rgba(107,251,154,0.1)' : 'transparent',
              color: actuators.some(a => a.mode === 'REMOTE') ? 'var(--spore-green)' : 'var(--on-surface-variant)',
            }}>
              MODE: {actuators.some(a => a.mode === 'REMOTE') ? 'REMOTE' : 'LOCAL'}
            </span>
          </div>
        </div>
        <div className="grid" style={{ height: '128px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[1, 2, 3, 4].map((ch, idx) => {
            const act = actuators.find(a => a.channel === ch) || { channel: ch, state: 'OFF', mode: 'LOCAL', label: `CH${ch}` }
            return (
              <div key={ch} style={{ borderRight: idx < 3 ? '1px solid var(--outline-variant)' : 'none' }}>
                <ActuatorControl
                  actuator={act}
                  meta={{ label: act.label || `CH${ch}`, icon: 'settings', color: 'primary' }}
                  cmdState={getCmdState(act)}
                  onToggle={handleToggle}
                />
              </div>
            )
          })}
        </div>
        <div className="bg-surface-container-lowest" style={{ padding: '6px 12px', borderTop: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--spore-green)', display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--on-surface-variant)' }}>{actuators.filter(a => a.lastAck === 'ACKED').length}/{actuators.length} ACKED</span>
            </div>
            <span style={{ width: '1px', height: '12px', background: 'rgba(61,74,62,0.4)', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--on-surface-variant)' }}>
              LATEST: {logs[0] ? `[${logs[0].ts}] ${logs[0].text}` : '--:--:-- waiting...'}
            </span>
          </div>
        </div>
      </div>

      {tgConfig && (
        <section className="bg-surface-container border border-outline-variant" style={{ borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">send</span>
              <span className="chart-panel-label">TELEGRAM ALERTS</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-8px font-label-caps text-on-surface-variant">ENABLED</span>
              <input type="checkbox" className="toggle-checkbox" checked={tgConfig.enabled} onChange={async e => {
                const val = e.target.checked
                setTgConfig(prev => ({ ...prev, enabled: val }))
                setTgSaving(true)
                try { await updateTelegramDeviceConfig(id, { enabled: val }) } catch {}
                setTgSaving(false)
              }} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4" style={{ padding: '12px' }}>
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">MIN SEVERITY</label>
              <select className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-body-sm text-on-surface cursor-pointer" value={tgConfig.minSeverity} onChange={async e => {
                const val = e.target.value
                setTgConfig(prev => ({ ...prev, minSeverity: val }))
                setTgSaving(true)
                try { await updateTelegramDeviceConfig(id, { minSeverity: val }) } catch {}
                setTgSaving(false)
              }}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="flex items-end">
              {tgSaving && <span className="text-8px text-on-surface-variant">SAVING...</span>}
            </div>
            <div className="flex items-center justify-between p-2 bg-surface-container-low rounded">
              <span className="text-8px font-label-caps text-on-surface-variant">SENSOR FAULT</span>
              <input type="checkbox" className="toggle-checkbox" checked={tgConfig.alertOnFault} onChange={async e => {
                const val = e.target.checked
                setTgConfig(prev => ({ ...prev, alertOnFault: val }))
                try { await updateTelegramDeviceConfig(id, { alertOnFault: val }) } catch {}
              }} />
            </div>
            <div className="flex items-center justify-between p-2 bg-surface-container-low rounded">
              <span className="text-8px font-label-caps text-on-surface-variant">OUT OF RANGE</span>
              <input type="checkbox" className="toggle-checkbox" checked={tgConfig.alertOnRange} onChange={async e => {
                const val = e.target.checked
                setTgConfig(prev => ({ ...prev, alertOnRange: val }))
                try { await updateTelegramDeviceConfig(id, { alertOnRange: val }) } catch {}
              }} />
            </div>
            <div className="flex items-center justify-between p-2 bg-surface-container-low rounded">
              <span className="text-8px font-label-caps text-on-surface-variant">DISCONNECT</span>
              <input type="checkbox" className="toggle-checkbox" checked={tgConfig.alertOnDisconnect} onChange={async e => {
                const val = e.target.checked
                setTgConfig(prev => ({ ...prev, alertOnDisconnect: val }))
                try { await updateTelegramDeviceConfig(id, { alertOnDisconnect: val }) } catch {}
              }} />
            </div>
            <div className="flex items-center justify-between p-2 bg-surface-container-low rounded">
              <span className="text-8px font-label-caps text-on-surface-variant">SYSTEM ERROR</span>
              <input type="checkbox" className="toggle-checkbox" checked={tgConfig.alertOnSystem} onChange={async e => {
                const val = e.target.checked
                setTgConfig(prev => ({ ...prev, alertOnSystem: val }))
                try { await updateTelegramDeviceConfig(id, { alertOnSystem: val }) } catch {}
              }} />
            </div>
          </div>
        </section>
      )}

      <ChartPanel deviceId={id} telemetry={telemetry} has={has} />
    </div>
  )
}

export default DeviceDetail
