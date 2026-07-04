import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDevice, getActuators, setActuatorDirect, getLatestTelemetry } from '../api/client.js'
import { useSSE } from '../api/useSSE.js'
import DomeGauge from '../components/ui/DomeGauge.jsx'
import ChartPanel from '../components/ui/ChartPanel.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import ActuatorControl from '../components/device/ActuatorControl.jsx'

const ACTUATOR_META = {
  1: { label: 'AIR EXCHANGE', icon: 'air', color: 'primary' },
  2: { label: 'MIST SPRAYERS', icon: 'water_drop', color: 'primary' },
  3: { label: 'CO2 INJECTION', icon: 'co2', color: 'error' },
  4: { label: 'UV-C STERILIZER', icon: 'light', color: 'secondary' },
}

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

  const [clockStr, setClockStr] = useState(new Date().toLocaleTimeString('en-GB', { hour12: false }))
  const prevTelemetry = useRef({})
  const gaugePrev = useRef({})
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
    if (!initial) {
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

  useEffect(() => {
    const iv = setInterval(() => {
      setClockStr(new Date().toLocaleTimeString('en-GB', { hour12: false }))
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const iv = setInterval(async () => {
      if (cancelledRef.current) return
      try {
        const latest = await getLatestTelemetry(id)
        if (!cancelledRef.current && latest?.temperature != null) {
          applyTelemetry(latest)
        }
      } catch {}
    }, 5000)
    return () => clearInterval(iv)
  }, [id])

  useEffect(() => {
    gaugePrev.current = {
      temp: telemetry.temperature,
      hum: telemetry.humidity,
      eco2: telemetry.co2,
      tvoc: telemetry.voc,
    }
  }, [telemetry.temperature, telemetry.humidity, telemetry.co2, telemetry.voc])

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
      const label = ACTUATOR_META[ch]?.label || `CH${ch}`
      if (data.status === 'ACKED') {
        addLog(`${label} → ACKED (${data.actuatorState.state})`, 'success')
      } else if (data.status === 'TIMEOUT') {
        addLog(`${label} → TIMEOUT`, 'error')
      }
    }
  }, [device, addLog]))

  function getCmdState(act) {
    if (pendingChannels.has(act.channel)) return 'PENDING'
    if (act.lastAck === 'ACKED') return 'ACKED'
    if (act.lastAck === 'TIMEOUT') return 'TIMEOUT'
    return null
  }

  async function handleToggle(channel) {
    const act = actuators.find(a => a.channel === channel)
    if (!act) return
    const newState = act.state === 'ON' ? 'OFF' : 'ON'
    const label = ACTUATOR_META[channel]?.label || `CH${channel}`
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

  const isOnline = device.status === 'ONLINE' || device.status === 'ACTIVE'
  const has = {
    temp: telemetry.temperature != null,
    hum: telemetry.humidity != null,
    eco2: telemetry.co2 != null,
    tvoc: telemetry.voc != null,
  }
  const co2Error = has.eco2 && telemetry.co2 > 2000

  function computeHealth() {
    const checks = [
      has.temp && telemetry.temperature >= 22 && telemetry.temperature <= 28,
      has.hum && telemetry.humidity >= 70 && telemetry.humidity <= 90,
      has.eco2 && telemetry.co2 >= 800 && telemetry.co2 <= 2000,
      has.tvoc && telemetry.voc >= 0 && telemetry.voc <= 500,
    ].filter(Boolean)
    if (checks.length === 0) return null
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }

  function sensorStatus(sk) {
    const s = SENSOR_CFG[sk]
    const v = telemetry[sk === 'eco2' ? 'co2' : sk === 'tvoc' ? 'voc' : sk]
    if (v == null) return null
    const ok = v >= s.optMin && v <= s.optMax
    const crit = !ok && (v > s.optMax * 1.15 || v < s.optMin * 0.85)
    return { ok, crit }
  }

  const health = computeHealth()
  const StatusPill = ({ sk, label }) => {
    const st = sensorStatus(sk)
    if (!st) return null
    const col = st.ok ? '#22c55e' : st.crit ? '#ef4444' : '#f59e0b'
    const txt = st.ok ? 'OK' : st.crit ? 'CRIT' : 'WARN'
    const bg = st.ok ? 'rgba(34,197,94,0.08)' : st.crit ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'
    return (
      <span style={{ fontSize: '7px', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '5px', letterSpacing: '0.04em', background: bg, color: col }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: col, display: 'inline-block' }} />
        {label} {txt}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate('/dashboard')}
        style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', cursor: 'pointer' }}
      >
        <span className="material-symbols-outlined text-16px" style={{ color: 'inherit' }}>arrow_back</span>
        BACK TO DASHBOARD
      </button>

      <section className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? 'var(--spore-green)' : 'var(--error-red)', display: 'inline-block', flexShrink: 0 }} />
            <h1 className="text-headline-lg text-on-surface">{device.chamberName || device.deviceId}</h1>
            <StatusBadge status={isOnline ? 'online' : 'critical'} label={isOnline ? 'ONLINE' : device.status} />
          </div>
          <p className="text-body-md text-on-surface-variant" style={{ marginTop: '4px' }}>
            Active Mycelium Colonization Phase
            <span style={{ fontSize: '8px', color: '#2e4036', fontFamily: 'var(--font-mono)' }}> · Phase: Fruiting</span>
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {health != null && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: health >= 75 ? '#22c55e' : health >= 50 ? '#f59e0b' : '#ef4444',
            }}>
              HEALTH {health}%
            </span>
          )}
          <span style={{ fontSize: '9px', color: '#4a6652', fontFamily: 'var(--font-mono)' }}>
            {clockStr}
          </span>
        </div>
      </section>

      <section className="flex gap-4">
        <div className="flex flex-col" style={{ flex: '1 1 70%', minWidth: 0 }}>
          <div className="text-9px text-on-surface-variant" style={{ letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', paddingLeft: '2px', paddingRight: '2px', marginBottom: '4px' }}>TELEMETRY GAUGES</div>
          <div className="flex flex-1">
            <DomeGauge value={has.temp ? telemetry.temperature : SENSOR_CFG.temp.min} prevValue={gaugePrev.current.temp} min={SENSOR_CFG.temp.min} max={SENSOR_CFG.temp.max} optMin={SENSOR_CFG.temp.optMin} optMax={SENSOR_CFG.temp.optMax} unit={SENSOR_CFG.temp.unit} label={SENSOR_CFG.temp.label} decimals={SENSOR_CFG.temp.decimals} history={sparkHistory.current.temp} noData={!has.temp} />
            <DomeGauge value={has.hum ? telemetry.humidity : SENSOR_CFG.hum.min} prevValue={gaugePrev.current.hum} min={SENSOR_CFG.hum.min} max={SENSOR_CFG.hum.max} optMin={SENSOR_CFG.hum.optMin} optMax={SENSOR_CFG.hum.optMax} unit={SENSOR_CFG.hum.unit} label={SENSOR_CFG.hum.label} decimals={SENSOR_CFG.hum.decimals} history={sparkHistory.current.hum} noData={!has.hum} />
            <DomeGauge value={has.eco2 ? telemetry.co2 : SENSOR_CFG.eco2.min} prevValue={gaugePrev.current.eco2} min={SENSOR_CFG.eco2.min} max={SENSOR_CFG.eco2.max} optMin={SENSOR_CFG.eco2.optMin} optMax={SENSOR_CFG.eco2.optMax} unit={SENSOR_CFG.eco2.unit} label={SENSOR_CFG.eco2.label} decimals={SENSOR_CFG.eco2.decimals} history={sparkHistory.current.eco2} noData={!has.eco2} />
            <DomeGauge value={has.tvoc ? telemetry.voc : SENSOR_CFG.tvoc.min} prevValue={gaugePrev.current.tvoc} min={SENSOR_CFG.tvoc.min} max={SENSOR_CFG.tvoc.max} optMin={SENSOR_CFG.tvoc.optMin} optMax={SENSOR_CFG.tvoc.optMax} unit={SENSOR_CFG.tvoc.unit} label={SENSOR_CFG.tvoc.label} decimals={SENSOR_CFG.tvoc.decimals} history={sparkHistory.current.tvoc} noData={!has.tvoc} />
          </div>
          <div className="flex flex-wrap" style={{ gap: '5px' }}>
            <StatusPill sk="temp" label="Temp" />
            <StatusPill sk="hum" label="Hum" />
            <StatusPill sk="eco2" label="eCO₂" />
            <StatusPill sk="tvoc" label="TVOC" />
            {co2Error && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '2px 8px', borderRadius: '3px' }}>
                ⚠ CO₂ OVER LIMIT
              </span>
            )}
          </div>
        </div>
        <div className="bg-surface-container border border-outline-variant flex flex-col" style={{ flex: '1 1 30%', minWidth: 0, borderRadius: '8px' }}>
          <div className="flex items-center justify-between" style={{ padding: '8px 12px', borderBottom: '1px solid var(--outline-variant)' }}>
            <span className="text-9px text-on-surface-variant" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>SYSTEM LOG</span>
            <span className="text-8px text-primary bg-primary/10" style={{ padding: '2px 6px', borderRadius: '4px' }}>LIVE</span>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ padding: '4px 8px', fontSize: '10px', fontFamily: 'var(--font-mono)', lineHeight: '1.25' }}>
            {logs.length === 0 && (
              <div className="opacity-30" style={{ padding: '4px' }}>[--:--:--] Waiting for data...</div>
            )}
            {logs.map((entry, i) => (
              <div className="flex gap-2" style={{ padding: '1px 0', opacity: i === 0 ? 1 : 0.6 }}>
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--on-surface)', letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase' }}>ACTUATOR OVERRIDE MATRIX</span>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--on-surface-variant)', opacity: 0.5 }}>{clockStr}</span>
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
              MODE: {actuators.some(a => a.mode === 'REMOTE') ? 'REMOTE' : 'MANUAL'}
            </span>
          </div>
        </div>
        <div className="grid" style={{ height: '128px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[1, 2, 3, 4].map((ch, idx) => {
            const act = actuators.find(a => a.channel === ch) || { channel: ch, state: 'OFF', mode: 'LOCAL' }
            return (
              <div key={ch} style={{ borderRight: idx < 3 ? '1px solid var(--outline-variant)' : 'none' }}>
                <ActuatorControl
                  actuator={act}
                  meta={ACTUATOR_META[ch]}
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
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--spore-green)', display: 'inline-block', boxShadow: '0 0 4px var(--spore-green)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--on-surface-variant)' }}>{actuators.filter(a => a.lastAck === 'ACKED').length}/{actuators.length} ACKED</span>
            </div>
            <span style={{ width: '1px', height: '12px', background: 'rgba(61,74,62,0.4)', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--on-surface-variant)' }}>
              LATEST_LOG: {logs[0] ? `[${logs[0].ts}] ${logs[0].text}` : '--:--:-- waiting...'}
            </span>
          </div>
          {cmdHistory.length > 0 && (
            <div className="flex items-center gap-1">
              {cmdHistory.slice(0, 3).map((h, i) => {
                const col = h.status === 'FAILED' ? 'var(--error-red)' : h.status === 'PENDING' ? 'var(--amber)' : 'var(--spore-green)'
                return (
                  <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: col, display: 'inline-block', boxShadow: `0 0 3px ${col}` }} />
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ChartPanel deviceId={id} telemetry={telemetry} has={has} />
    </div>
  )
}

export default DeviceDetail
