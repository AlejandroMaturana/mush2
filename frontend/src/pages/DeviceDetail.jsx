import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDevice, getActuators, setActuatorDirect } from '../api/client.js'
import { useSSE } from '../api/useSSE.js'
import ArcGauge from '../components/ui/ArcGauge.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import ActuatorControl from '../components/device/ActuatorControl.jsx'

const ACTUATOR_META = {
  1: { label: 'AIR EXCHANGE', icon: 'air', color: 'primary' },
  2: { label: 'MIST SPRAYERS', icon: 'water_drop', color: 'primary' },
  3: { label: 'CO2 INJECTION', icon: 'co2', color: 'error' },
  4: { label: 'UV-C STERILIZER', icon: 'light', color: 'secondary' },
}

const SPARKLINES = {
  temp: '0,10 10,11 20,10 30,9 40,10 50,11 60,10 70,9 80,10 90,11 100,10',
  hum: '0,12 10,10 20,18 30,5 40,8 50,2 60,10 70,14 80,8 90,12 100,10',
  co2: '0,15 10,12 20,18 30,5 40,8 50,2 60,10 70,14 80,8 90,12 100,10',
  o2: '0,5 20,8 40,5 60,6 80,4 100,5',
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
  const [pendingChannels, setPendingChannels] = useState(new Set())
  const logIndex = useRef(0)

  const LOG_ENTRIES = [
    'Syncing chamber mesh nodes...',
    'Bio-filter efficiency at 94.2%',
    'Adjusting humidity setpoints for fruiting stage.',
    'Analyzing spore density across quadrant C...',
    'Substrate temperature drifting +0.1C',
    'Relaying diagnostic data to System Core Alpha.',
    'CO2 Sensor (ADDR: 0x3F) dropped from bus. Resetting...',
    'O2 Levels compensating for missing CO2 data.',
  ]

  const addLog = useCallback((text, type = 'info') => {
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false })
    setLogs(prev => [{ ts, text, type }, ...prev].slice(0, 12))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const text = LOG_ENTRIES[logIndex.current % LOG_ENTRIES.length]
      addLog(text)
      logIndex.current++
    }, 5000)
    return () => clearInterval(interval)
  }, [addLog])

  const cancelledRef = useRef(false)

  async function loadData() {
    try {
      const [dev, acts] = await Promise.all([getDevice(id), getActuators(id)])
      if (cancelledRef.current) return
      setDevice(dev)
      setActuators(acts)
      setError(null)
      addLog('System initialized. Chamber telemetry active.', 'info')
    } catch (err) {
      if (!cancelledRef.current) setError(err.message || 'Connection error')
    } finally {
      if (!cancelledRef.current) setLoading(false)
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
        setTelemetry(prev => ({
          ...prev,
          temperature: data.sensors.temperature,
          humidity: data.sensors.humidity,
          co2: data.sensors.co2,
          voc: data.sensors.voc,
          ts: new Date().toISOString(),
        }))
      }
    }
    if (type === 'ack') {
      setActuators(prev => prev.map(a =>
        a.channel === data.actuatorState?.channel
          ? { ...a, state: data.actuatorState.state, lastAck: data.status }
          : a
      ))
      setPendingChannels(prev => {
        const next = new Set(prev)
        next.delete(data.actuatorState?.channel)
        return next
      })
    }
  }, [device]))

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
    setPendingChannels(prev => new Set([...prev, channel]))
    addLog(`Actuator CH${channel} toggled ${newState}`, newState === 'ON' ? 'success' : 'warn')
    try {
      await setActuatorDirect(device.deviceId, channel, newState)
      setActuators(prev => prev.map(a =>
        a.channel === channel ? { ...a, state: newState } : a
      ))
    } catch (err) {
      setPendingChannels(prev => {
        const next = new Set(prev)
        next.delete(channel)
        return next
      })
      addLog(`Actuator CH${channel} command failed: ${err.response?.data?.error || 'timeout'}`, 'error')
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
    co2: telemetry.co2 != null,
  }
  const hasTelemetry = has.temp || has.hum || has.co2
  const co2Error = has.co2 && telemetry.co2 > 2000

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
            <h1 className="text-headline-lg text-on-surface">{device.chamberName || device.deviceId}</h1>
            <StatusBadge status={isOnline ? 'online' : 'critical'} label={isOnline ? 'ONLINE' : device.status} />
          </div>
          <p className="text-body-md text-on-surface-variant">Active Mycelium Colonization Phase</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-surface-container-high px-3 py-1 rounded text-10px font-label-caps text-secondary flex items-center gap-1 border border-outline-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" style={{ boxShadow: '0 0 8px #44e2cd' }} />
            SYSTEM NOMINAL
          </span>
          {co2Error && (
            <span className="bg-error-container/20 px-3 py-1 rounded text-10px font-label-caps text-error flex items-center gap-1 border border-error/30">
              <span className="material-symbols-outlined text-12px">warning</span>
              SENSOR FAILURE
            </span>
          )}
          {!hasTelemetry && (
            <span className="bg-surface-container-high px-3 py-1 rounded text-10px font-label-caps text-amber flex items-center gap-1 border border-amber/30">
              <span className="material-symbols-outlined text-12px animate-pulse">graphic_eq</span>
              AWAITING DATA
            </span>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-container p-4 rounded border border-outline-variant flex flex-col items-center group hover:bg-surface-container-high transition-all duration-300">
          <div className="flex justify-between items-start w-full mb-2">
            <span className="font-label-caps text-label-caps text-on-surface-variant">HUMIDITY</span>
            <span className="material-symbols-outlined text-primary text-sm">water_drop</span>
          </div>
          <ArcGauge value={has.hum ? Math.round(telemetry.humidity) : 0} min={50} max={100} unit="%" color="primary" size="md" trend={SPARKLINES.hum} />
        </div>
        <div className="bg-surface-container p-4 rounded border border-outline-variant flex flex-col items-center group hover:bg-surface-container-high transition-all duration-300">
          <div className="flex justify-between items-start w-full mb-2">
            <span className="font-label-caps text-label-caps text-on-surface-variant">TEMPERATURE</span>
            <span className="material-symbols-outlined text-secondary text-sm">thermostat</span>
          </div>
          <ArcGauge value={has.temp ? Math.round(telemetry.temperature * 10) / 10 : 0} min={10} max={40} unit="°C" color="secondary" size="md" trend={SPARKLINES.temp} />
        </div>
        <div className={`bg-surface-container-low p-4 rounded flex flex-col items-center relative transition-all duration-500${co2Error ? '' : ' border border-outline-variant group hover:bg-surface-container-high'}${co2Error ? ' border border-error/40' : ''}`}
          style={co2Error ? { boxShadow: '0 0 15px rgba(239,68,68,0.15)' } : {}}>
          <div className="flex justify-between items-start w-full mb-2">
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-label-caps text-on-surface-variant">CO2 CONC.</span>
              {co2Error && <span className="material-symbols-outlined text-error text-16px">report</span>}
            </div>
            <span className="material-symbols-outlined text-error text-sm">co2</span>
          </div>
          <div className={co2Error ? 'opacity-60' : ''}>
            <ArcGauge value={has.co2 ? telemetry.co2 : 0} min={400} max={2500} unit="ppm" color="tertiary" size="md"
              errorState={co2Error} errorMessage={co2Error ? 'Signal Lost: Sensor RS-485 Timeout' : undefined} />
          </div>
          {co2Error && <div className="absolute inset-0 bg-error/5 pointer-events-none rounded" />}
        </div>
        <div className="bg-surface-container p-4 rounded border border-outline-variant flex flex-col items-center group hover:bg-surface-container-high transition-all duration-300">
          <div className="flex justify-between items-start w-full mb-2">
            <span className="font-label-caps text-label-caps text-on-surface-variant">O2 LEVEL</span>
            <span className="material-symbols-outlined text-tertiary text-sm">air</span>
          </div>
          <ArcGauge value={19.8} min={18} max={22} unit="%" color="tertiary" size="md" trend={SPARKLINES.o2} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-[200px]">
        <div className="lg:col-span-1 bg-surface-container p-4 rounded border border-outline-variant flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-label-caps text-label-caps text-on-surface-variant">SYSTEM TELEMETRY LOG</span>
            <span className="text-10px text-primary bg-primary/10 px-2 py-0.5 rounded">LIVE</span>
          </div>
          <div className="flex-1 overflow-y-auto text-12px font-mono leading-relaxed space-y-1 pr-1" style={{ scrollbarWidth: 'thin' }}>
            {logs.length === 0 && (
              <div className="opacity-30">[--:--:--] Waiting for data...</div>
            )}
            {logs.map((entry, i) => (
              <div key={i} className={`flex gap-2 ${i === 0 ? '' : 'opacity-50'}`}>
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
        <div className="lg:col-span-2 bg-surface-container rounded border border-outline-variant overflow-hidden flex flex-col">
          <div className="p-4 border-b border-outline-variant bg-surface-container-high flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant">ACTUATOR OVERRIDE MATRIX</span>
            <div className="bg-surface-container px-2 py-1 rounded text-10px font-label-caps border border-outline">MODE: MANUAL</div>
          </div>
          <div className="flex-1 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-min">
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
            <div className="col-span-full h-28 bg-surface-container-lowest rounded border border-outline-variant relative overflow-hidden group">
              <div className="absolute inset-0 p-4">
                <div className="flex justify-between items-start">
                  <span className="font-label-caps text-10px text-outline">THERMAL MAPPING RECON</span>
                  <span className="material-symbols-outlined text-outline text-sm">grid_view</span>
                </div>
              </div>
              <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 200">
                <circle className="breathing-pulse" cx="100" cy="80" fill="#6bfb9a" r="3" />
                <circle className="breathing-pulse" cx="250" cy="130" fill="#6bfb9a" r="3" />
                <circle className="breathing-pulse" cx="400" cy="60" fill="#6bfb9a" r="3" />
                <circle className="breathing-pulse" cx="550" cy="140" fill="#6bfb9a" r="3" />
                <circle className="breathing-pulse" cx="700" cy="90" fill="#44e2cd" r="3" />
                <path d="M100,80 Q175,105 250,130" fill="none" stroke="#6bfb9a" strokeWidth="1" className="bioluminescent-path" />
                <path d="M250,130 Q325,95 400,60" fill="none" stroke="#6bfb9a" strokeWidth="1" className="bioluminescent-path" />
                <path d="M400,60 Q475,100 550,140" fill="none" stroke="#6bfb9a" strokeWidth="1" className="bioluminescent-path" />
                <path d="M550,140 Q625,115 700,90" fill="none" stroke="#44e2cd" strokeWidth="1" className="bioluminescent-path" />
              </svg>
              <div className="absolute bottom-3 right-4 text-right">
                <div className="font-label-caps text-10px text-primary">COLONY DENSITY</div>
                <div className="text-headline-lg text-on-surface">64.8<span className="text-data-sm text-on-surface-variant ml-1">%</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default DeviceDetail
