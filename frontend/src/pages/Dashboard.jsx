import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getDevices, getLatestTelemetry } from '../api/client.js'
import { useSSE } from '../api/useSSE.js'
import Gauge from '../components/ui/Gauge.jsx'
import SegmentedBar from '../components/ui/SegmentedBar.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import MetricCard from '../components/ui/MetricCard.jsx'
import DevicesEmptyState from '../components/ui/DevicesEmptyState.jsx'

function aggregateTelemetry(telemetryMap) {
  const valid = Object.values(telemetryMap).filter(t => t && (t.temperature != null || t.humidity != null))
  if (valid.length === 0) return null
  const agg = { devices: valid.length }
  const tVals = valid.filter(t => t.temperature != null).map(t => t.temperature)
  const hVals = valid.filter(t => t.humidity != null).map(t => t.humidity)
  if (tVals.length > 0) agg.tempAvg = tVals.reduce((a, b) => a + b, 0) / tVals.length
  if (hVals.length > 0) agg.humAvg = hVals.reduce((a, b) => a + b, 0) / hVals.length
  return agg
}

function ChamberCard({ device, telemetry }) {
  const hasTemp = telemetry?.temperature != null
  const hasHum = telemetry?.humidity != null
  const isCritical = device.status === 'CRITICAL' || device.status === 'OFFLINE'

  return (
    <div className={`glass-card p-5 rounded-xl flex flex-col gap-5${isCritical ? ' border-error/40 bg-error-container/5' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <span className={`status-dot ${isCritical ? 'error pulse' : 'online breathing-pulse'}${!isCritical ? ' active-glow' : ''}`} />
          <div>
            <h3 className="text-headline-md leading-none text-on-surface">{device.chamberName || device.deviceId}</h3>
            <span className="text-10px font-label-caps text-on-surface-variant uppercase">Oyster Mushroom — Week 2</span>
          </div>
        </div>
        <StatusBadge status={isCritical ? 'critical' : 'online'} label={isCritical ? 'CRITICAL' : 'AUTO: ACTIVE'} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-label-caps text-10px text-on-surface-variant">TEMP CONTROL</span>
          <div className="flex items-center gap-2">
            <Gauge variant="donut" value={hasTemp ? telemetry.temperature : 0} min={15} max={35} size="sm" />
            <div>
              <span className="text-headline-md text-on-surface">{hasTemp ? `${telemetry.temperature}°` : '--°'}</span>
              <span className="block text-8px text-on-surface-variant">TARGET 24.5</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-label-caps text-10px text-on-surface-variant">HUMIDITY</span>
          <div className="flex items-center gap-2">
            <Gauge variant="donut" value={hasHum ? telemetry.humidity : 0} min={50} max={100} size="sm" />
            <div>
              <span className="text-headline-md text-on-surface">{hasHum ? `${telemetry.humidity}%` : '--%'}</span>
              <span className="block text-8px text-on-surface-variant">STABLE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-end">
          <span className="font-label-caps text-10px text-on-surface-variant uppercase">Phase: Incubación</span>
          <span className="text-data-sm text-primary">75% Complete</span>
        </div>
        <SegmentedBar active={15} total={20} color="primary" />
      </div>

      <div className="h-10 opacity-30 pointer-events-none mt-2">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 200 40">
          <path d="M0,30 Q20,25 40,32 T80,20 T120,35 T160,25 T200,30 L200,40 L0,40 Z" fill="rgba(107, 251, 154, 0.4)" stroke="#6bfb9a" strokeWidth="1" />
        </svg>
      </div>

      <Link to={`/devices/${device.id}`} className="w-full py-2.5 rounded bg-surface-variant hover:bg-primary hover:text-on-primary font-label-caps text-label-caps transition-all flex justify-center items-center gap-2 mt-auto no-underline">
        VIEW TELEMETRY
        <span className="material-symbols-outlined text-14px">query_stats</span>
      </Link>
    </div>
  )
}

function Dashboard() {
  const [devices, setDevices] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [telemetry, setTelemetry] = useState({})
  const [telemetryMap, setTelemetryMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [alarms, setAlarms] = useState([])

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const devs = await getDevices()
        if (cancelled) return
        setDevices(devs)

        if (devs.length > 0) {
          const targetId = selectedId || devs[0].id
          if (!selectedId && !cancelled) setSelectedId(targetId)

          const [tel, allTel] = await Promise.all([
            getLatestTelemetry(targetId),
            Promise.all(devs.map(d => getLatestTelemetry(d.id).catch(() => null))),
          ])
          if (cancelled) return
          setTelemetry(tel)

          const map = {}
          devs.forEach((d, i) => { map[d.id] = allTel[i] })
          setTelemetryMap(map)
        } else {
          setSelectedId(null)
          setTelemetry({})
          setTelemetryMap({})
        }
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Error de conexión')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [selectedId])

  useSSE(useCallback((type, data) => {
    if (type === 'telemetry') {
      const dev = devices.find(d => d.deviceId === data.deviceId)
      if (dev) {
        const update = {
          temperature: data.sensors?.temperature,
          humidity: data.sensors?.humidity,
          co2: data.sensors?.co2,
          voc: data.sensors?.voc,
          ts: new Date().toISOString(),
        }
        if (dev.id === selectedId) {
          setTelemetry(prev => ({ ...prev, ...update }))
        }
        setTelemetryMap(prev => ({ ...prev, [dev.id]: { ...prev[dev.id], ...update } }))
      }
    }
    if (type === 'alarm') {
      setAlarms(prev => [{ reason: data.reason, ts: data.ts }, ...prev].slice(0, 10))
    }
  }, [devices, selectedId]))

  if (loading) return <div className="loading">Conectando...</div>
  if (error && devices.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="material-symbols-outlined text-48px text-error mb-4">wifi_off</span>
          <p className="text-body-md text-error font-semibold">{error}</p>
          <button className="mt-4 px-5 py-2 bg-error/20 border border-error/40 text-error font-label-caps rounded-md" onClick={() => window.location.reload()}>
            REINTENTAR
          </button>
        </div>
      </div>
    )
  }

  const agg = aggregateTelemetry(telemetryMap)

  return (
    <div className="dashboard">
      {alarms.length > 0 && (
        <section className="mb-6">
          <div className="glass-card p-4 rounded-xl border-l-4 border-l-error bg-error-container/10 flex items-center gap-3">
            <span className="material-symbols-outlined text-error">warning</span>
            <div>
              <span className="text-label-caps text-error">CRITICAL STATUS</span>
              <p className="text-data-sm text-on-surface font-bold">{alarms[0].reason}</p>
            </div>
            <span className="ml-auto text-data-sm text-on-surface-variant">{new Date(alarms[0].ts).toLocaleTimeString()}</span>
          </div>
        </section>
      )}

      <section className="mb-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-headline-lg text-on-surface mb-1">System Overview</h1>
            <p className="text-body-md text-on-surface-variant">Fleet-wide environmental aggregate</p>
          </div>
          <div className="flex flex-wrap gap-4">
            {agg?.tempAvg != null && (
              <div className="glass-card flex items-center p-4 rounded-xl gap-4 border-l-4 border-l-primary bg-surface-container-low min-w-[180px">
                <Gauge variant="half" value={Math.round(agg.tempAvg * 10) / 10} min={10} max={40} unit="°C" size="sm" />
                <div>
                  <span className="text-label-caps text-on-surface-variant block">AVG TEMP</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-headline-lg text-primary">{Math.round(agg.tempAvg * 10) / 10}°C</span>
                    <span className="text-10px font-label-caps text-primary">+0.2</span>
                  </div>
                </div>
              </div>
            )}
            {agg?.humAvg != null && (
              <div className="glass-card flex items-center p-4 rounded-xl gap-4 border-l-4 border-l-secondary bg-surface-container-low min-w-[180px">
                <Gauge variant="half" value={Math.round(agg.humAvg)} min={50} max={100} unit="%" size="sm" />
                <div>
                  <span className="text-label-caps text-on-surface-variant block">AVG HUMIDITY</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-headline-lg text-teal">{Math.round(agg.humAvg)}%</span>
                    <span className="text-10px font-label-caps text-teal">-1.4</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {devices.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-headline-md text-on-surface">Chambers</h2>
            <select
              className="bg-surface-container border border-outline-variant rounded-md text-body-md text-on-surface px-3 py-1.5 cursor-pointer focus:outline-none focus:border-primary"
              value={selectedId || ''}
              onChange={e => setSelectedId(Number(e.target.value))}
            >
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.chamberName || d.deviceId}</option>
              ))}
            </select>
          </div>

          {telemetry && Object.keys(telemetry).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {telemetry.temperature != null && <MetricCard icon="thermostat" label="Temperature" value={telemetry.temperature} unit="°C" />}
              {telemetry.humidity != null && <MetricCard icon="humidity_high" label="Humidity" value={telemetry.humidity} unit="%" />}
              {telemetry.co2 != null && <MetricCard icon="air" label="CO₂" value={telemetry.co2} unit="ppm" />}
              {telemetry.voc != null && <MetricCard icon="science" label="VOC" value={telemetry.voc} unit="ppb" />}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map(device => (
              <ChamberCard key={device.id} device={device} telemetry={telemetryMap[device.id]} />
            ))}
          </div>
        </section>
      )}

      {devices.length === 0 && (
        <DevicesEmptyState onConnect={() => window.location.reload()} />
      )}
    </div>
  )
}

export default Dashboard
