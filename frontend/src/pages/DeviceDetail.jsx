import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDevice, getActuators, setActuatorDirect, getLatestTelemetry, getTelemetryHistory } from '../api/client.js'
import { useSSE } from '../api/useSSE.js'
import DomeGauge from '../components/ui/DomeGauge.jsx'
import DeviceHistoryChart from '../components/ui/DeviceHistoryChart.jsx'
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

function reshapeHistory(rows) {
  const byTime = {}
  for (const r of rows) {
    const t = r.timestamp ? new Date(r.timestamp) : new Date()
    const key = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`
    if (!byTime[key]) byTime[key] = {}
    byTime[key][r.sensorType] = parseFloat(r.value)
  }
  const sorted = Object.entries(byTime).sort(([a], [b]) => a.localeCompare(b))
  return sorted.map(([t, v]) => ({
    t,
    temp: v.TEMPERATURE ?? null,
    hum: v.HUMIDITY ?? null,
    eco2: v.CO2 ?? null,
    tvoc: v.VOC ?? null,
  }))
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
  const [chartLabels, setChartLabels] = useState([])
  const [chartTemp, setChartTemp] = useState([])
  const [chartHum, setChartHum] = useState([])
  const [chartEco2, setChartEco2] = useState([])
  const [chartTvoc, setChartTvoc] = useState([])

  const [clockStr, setClockStr] = useState(new Date().toLocaleTimeString('en-GB', { hour12: false }))
  const prevTelemetry = useRef({})
  const gaugePrev = useRef({})
  const sparkHistory = useRef({ temp: [], hum: [], eco2: [], tvoc: [] })
  const chartHistory = useRef([])
  const cancelledRef = useRef(false)

  const addLog = useCallback((text, type = 'info') => {
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false })
    setLogs(prev => [{ ts, text, type }, ...prev].slice(0, 20))
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

  async function fetchHistory() {
    try {
      const rows = await getTelemetryHistory(id, { limit: 30 })
      if (cancelledRef.current || !rows?.length) return
      const reshaped = reshapeHistory(rows)
      if (!reshaped.length) return
      chartHistory.current = reshaped
      setChartLabels(reshaped.map(d => d.t))
      setChartTemp(reshaped.map(d => d.temp ?? 0))
      setChartHum(reshaped.map(d => d.hum ?? 0))
      setChartEco2(reshaped.map(d => d.eco2 ?? 0))
      setChartTvoc(reshaped.map(d => d.tvoc ?? 0))
    } catch {}
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
    const now = new Date()
    const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const prev = chartHistory.current[chartHistory.current.length - 1] || {}
    const entry = {
      t,
      temp: sensors.temperature ?? prev.temp ?? 0,
      hum: sensors.humidity ?? prev.hum ?? 0,
      eco2: sensors.co2 ?? prev.eco2 ?? 0,
      tvoc: sensors.voc ?? prev.tvoc ?? 0,
    }
    const ch = [...chartHistory.current.slice(-29), entry]
    chartHistory.current = ch
    setChartLabels(ch.map(d => d.t))
    setChartTemp(ch.map(d => d.temp))
    setChartHum(ch.map(d => d.hum))
    setChartEco2(ch.map(d => d.eco2))
    setChartTvoc(ch.map(d => d.tvoc))

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
    fetchHistory()
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
  const chart1Data = [
    { label: 'Temp', data: chartTemp, yAxisID: 'y1', borderColor: '#f59e0b', borderWidth: 1.5, tension: 0.4 },
    { label: 'Hum', data: chartHum, yAxisID: 'y2', borderColor: '#38bdf8', borderWidth: 1.5, borderDash: [4, 2], tension: 0.4 },
  ]
  const chart1Bands = [
    { ax: 'y1', min: 22, max: 28, fill: 'rgba(245,158,11,0.06)', stroke: 'rgba(245,158,11,0.22)' },
    { ax: 'y2', min: 70, max: 90, fill: 'rgba(56,189,248,0.06)', stroke: 'rgba(56,189,248,0.22)' },
  ]
  const chart2Data = [
    { label: 'eCO2', data: chartEco2, yAxisID: 'y1', borderColor: '#a78bfa', borderWidth: 1.5, tension: 0.4 },
    { label: 'TVOC', data: chartTvoc, yAxisID: 'y2', borderColor: '#fb7185', borderWidth: 1.5, borderDash: [4, 2], tension: 0.4 },
  ]
  const chart2Bands = [
    { ax: 'y1', min: 800, max: 2000, fill: 'rgba(167,139,250,0.06)', stroke: 'rgba(167,139,250,0.22)' },
    { ax: 'y2', min: 0, max: 500, fill: 'rgba(251,113,133,0.06)', stroke: 'rgba(251,113,133,0.22)' },
  ]

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
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary font-label-caps text-label-caps transition-colors mb-1"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span className="material-symbols-outlined text-16px">arrow_back</span>
        BACK TO DASHBOARD
      </button>

      <section className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isOnline ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
            <h1 className="text-headline-lg text-on-surface">{device.chamberName || device.deviceId}</h1>
            <StatusBadge status={isOnline ? 'online' : 'critical'} label={isOnline ? 'ONLINE' : device.status} />
          </div>
          <p className="text-body-md text-on-surface-variant">
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

      <div className="bg-surface-container rounded border border-outline-variant overflow-hidden flex flex-col" style={{ minHeight: '200px' }}>
        <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-high flex items-center justify-between">
          <span className="font-label-caps text-10px text-on-surface-variant tracking-wider">ACTUATOR OVERRIDE MATRIX</span>
          <div className="flex items-center gap-3">
            <span className="text-7px font-label-caps text-on-surface-variant opacity-40">{clockStr}</span>
            <span className={`text-8px font-label-caps px-2 py-1 rounded border ${actuators.some(a => a.mode === 'REMOTE') ? 'text-primary border-primary/30 bg-primary/10' : 'text-on-surface-variant border-outline-variant'}`}>
              MODE: {actuators.some(a => a.mode === 'REMOTE') ? 'REMOTE' : 'MANUAL'}
            </span>
          </div>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
            {[1, 2, 3, 4].map(ch => {
              const act = actuators.find(a => a.channel === ch) || { channel: ch, state: 'OFF', mode: 'LOCAL' }
              return (
                <ActuatorControl
                  key={ch}
                  deviceId={device.deviceId}
                  actuator={act}
                  meta={ACTUATOR_META[ch]}
                  cmdState={getCmdState(act)}
                  onToggle={handleToggle}
                />
              )
            })}
          </div>
          <div className="flex items-stretch gap-3">
            {cmdHistory.length > 0 && (
              <div className="border border-outline-variant rounded p-3 flex-1">
                <span className="font-label-caps text-8px text-on-surface-variant block mb-2 tracking-wider">COMMAND HISTORY</span>
                <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  {cmdHistory.map((h, i) => {
                    const statusColors = {
                      PENDING: 'text-amber border-amber/30 bg-amber/10',
                      SENT: 'text-primary border-primary/30 bg-primary/10',
                      FAILED: 'text-error border-error/30 bg-error/10',
                    }
                    return (
                      <div key={i} className={`text-8px font-label-caps px-2 py-1 rounded border flex items-center gap-1.5 ${statusColors[h.status] || ''}`}>
                        <span className="opacity-50">{h.ts}</span>
                        <span>{h.label}</span>
                        <span className="opacity-70">→</span>
                        <span className={h.cmd === 'ON' ? 'text-primary' : ''}>{h.cmd}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="border border-outline-variant rounded p-3 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-0.5">
                  {actuators.map((a, i) => (
                    <span key={i}
                      className="w-2 h-2 rounded-full border border-surface-container"
                      style={{
                        background: a.state === 'ON' ? '#22c55e' : a.lastAck === 'TIMEOUT' ? '#ef4444' : '#2e4036',
                        boxShadow: a.state === 'ON' ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
              <span className="text-8px font-label-caps text-on-surface-variant">
                {actuators.filter(a => a.lastAck === 'ACKED').length}/{actuators.length} ACKED
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <DomeGauge value={has.temp ? telemetry.temperature : SENSOR_CFG.temp.min} prevValue={gaugePrev.current.temp} min={SENSOR_CFG.temp.min} max={SENSOR_CFG.temp.max} optMin={SENSOR_CFG.temp.optMin} optMax={SENSOR_CFG.temp.optMax} unit={SENSOR_CFG.temp.unit} label={SENSOR_CFG.temp.label} decimals={SENSOR_CFG.temp.decimals} history={sparkHistory.current.temp} noData={!has.temp} />
        <DomeGauge value={has.hum ? telemetry.humidity : SENSOR_CFG.hum.min} prevValue={gaugePrev.current.hum} min={SENSOR_CFG.hum.min} max={SENSOR_CFG.hum.max} optMin={SENSOR_CFG.hum.optMin} optMax={SENSOR_CFG.hum.optMax} unit={SENSOR_CFG.hum.unit} label={SENSOR_CFG.hum.label} decimals={SENSOR_CFG.hum.decimals} history={sparkHistory.current.hum} noData={!has.hum} />
        <DomeGauge value={has.eco2 ? telemetry.co2 : SENSOR_CFG.eco2.min} prevValue={gaugePrev.current.eco2} min={SENSOR_CFG.eco2.min} max={SENSOR_CFG.eco2.max} optMin={SENSOR_CFG.eco2.optMin} optMax={SENSOR_CFG.eco2.optMax} unit={SENSOR_CFG.eco2.unit} label={SENSOR_CFG.eco2.label} decimals={SENSOR_CFG.eco2.decimals} history={sparkHistory.current.eco2} noData={!has.eco2} />
        <DomeGauge value={has.tvoc ? telemetry.voc : SENSOR_CFG.tvoc.min} prevValue={gaugePrev.current.tvoc} min={SENSOR_CFG.tvoc.min} max={SENSOR_CFG.tvoc.max} optMin={SENSOR_CFG.tvoc.optMin} optMax={SENSOR_CFG.tvoc.optMax} unit={SENSOR_CFG.tvoc.unit} label={SENSOR_CFG.tvoc.label} decimals={SENSOR_CFG.tvoc.decimals} history={sparkHistory.current.tvoc} noData={!has.tvoc} />
      </section>

      <section style={{ display: 'flex', gap: '5px', padding: '4px 0', flexWrap: 'wrap' }}>
        <StatusPill sk="temp" label="Temp" />
        <StatusPill sk="hum" label="Hum" />
        <StatusPill sk="eco2" label="eCO₂" />
        <StatusPill sk="tvoc" label="TVOC" />
        {co2Error && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '7px', color: '#ef4444',
            background: 'rgba(239,68,68,0.08)', padding: '2px 8px', borderRadius: '3px',
          }}>
            ⚠ CO₂ OVER LIMIT
          </span>
        )}
      </section>

      <section className="flex flex-col gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
        <div className="flex">
          <div style={{ flex: 1, minWidth: 0 }}>
            <DeviceHistoryChart
              title="Temperature & Humidity — 6h"
              datasets={chart1Data}
              bands={chart1Bands}
              y1Domain={[18, 36]}
              y2Domain={[50, 100]}
              labels={chartLabels}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <DeviceHistoryChart
              title="eCO₂ & TVOC — 6h"
              datasets={chart2Data}
              bands={chart2Bands}
              y1Domain={[200, 3000]}
              y2Domain={[0, 950]}
              labels={chartLabels}
            />
          </div>
        </div>
        {chartLabels.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingLeft: '4px' }}>
            {[
              { id: 't', c: '#f59e0b', lbl: `Temp ${has.temp ? telemetry.temperature.toFixed(1) : '--'} °C` },
              { id: 'h', c: '#38bdf8', lbl: `Hum ${has.hum ? telemetry.humidity.toFixed(1) : '--'} %RH` },
              { id: 'e', c: '#a78bfa', lbl: `eCO₂ ${has.eco2 ? Math.round(telemetry.co2) : '--'} ppm` },
              { id: 'v', c: '#fb7185', lbl: `TVOC ${has.tvoc ? Math.round(telemetry.voc) : '--'} ppb` },
            ].map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '7px', color: '#4a6652', fontFamily: 'var(--font-mono)' }}>
                <span style={{ width: '14px', height: '2px', borderRadius: '1px', background: item.c, display: 'inline-block' }} />
                <span>{item.lbl}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '7px', color: '#4a6652', fontFamily: 'var(--font-mono)' }}>
              <span style={{ width: '14px', height: '6px', borderRadius: '1px', border: '1px dashed rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.07)', display: 'inline-block' }} />
              <span>optimal</span>
            </div>
          </div>
        )}
      </section>

      <section className="bg-surface-container rounded border border-outline-variant flex flex-col h-[300px]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-outline-variant">
          <span className="font-label-caps text-9px text-on-surface-variant">SYSTEM LOG</span>
          <span className="text-8px text-primary bg-primary/10 px-1.5 py-0.5 rounded">LIVE</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 text-11px font-mono leading-relaxed" style={{ scrollbarWidth: 'thin' }}>
          {logs.length === 0 && (
            <div className="opacity-30 p-2">[--:--:--] Waiting for data...</div>
          )}
          {logs.map((entry, i) => (
            <div key={i} className={`flex gap-2 py-0.5 ${i === 0 ? '' : 'opacity-60'}`}>
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
      </section>
    </div>
  )
}

export default DeviceDetail
