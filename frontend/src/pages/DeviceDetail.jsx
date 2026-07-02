import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDevice, getActuators, setActuatorDirect } from '../api/client.js'
import { useSSE } from '../api/useSSE.js'
import ArcGauge from '../components/ui/ArcGauge.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'

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

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const [dev, acts] = await Promise.all([getDevice(id), getActuators(id)])
        if (cancelled) return
        setDevice(dev)
        setActuators(acts)
        setError(null)
        addLog('System initialized. Chamber telemetry active.', 'info')
      } catch (err) {
        if (!cancelled) setError(err.message || 'Connection error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
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
    }
  }, [device]))

  async function handleToggle(channel) {
    const act = actuators.find(a => a.channel === channel)
    if (!act) return
    const newState = act.state === 'ON' ? 'OFF' : 'ON'
    addLog(`Actuator CH${channel} toggled ${newState}`, newState === 'ON' ? 'success' : 'warn')
    try {
      await setActuatorDirect(device.deviceId, channel, newState)
      setActuators(prev => prev.map(a =>
        a.channel === channel ? { ...a, state: newState } : a
      ))
    } catch (err) {
      addLog(`Actuator CH${channel} command failed: ${err.response?.data?.error || 'timeout'}`, 'error')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <span className="material-symbols-outlined text-48px text-primary opacity-50 mb-4 animate-pulse">sync</span>
        <p className="text-body-md text-on-surface-variant">Connecting to device...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <span className="material-symbols-outlined text-48px text-error mb-4">wifi_off</span>
        <p className="text-body-md text-error font-semibold">{error}</p>
        <button className="mt-4 px-5 py-2 bg-error/20 border border-error/40 text-error font-label-caps rounded-md" onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
          RETRY
        </button>
      </div>
    </div>
  )

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
          <div className="flex-1 relative p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" preserveAspectRatio="none">
              <path d="M100,50 Q150,150 300,100" fill="none" stroke="#44e2cd" strokeWidth="1" className="bioluminescent-path" />
              <path d="M400,250 Q200,100 100,200" fill="none" stroke="#6bfb9a" strokeWidth="1" className="bioluminescent-path" />
            </svg>
            {[1, 2, 3, 4].map(ch => {
              const act = actuators.find(a => a.channel === ch) || { channel: ch, state: 'OFF', mode: 'LOCAL' }
              const meta = ACTUATOR_META[ch] || { label: `CH${ch}`, icon: 'settings', color: 'primary' }
              const isOn = act.state === 'ON'
              const isError = meta.color === 'error'
              return (
                <div key={ch}
                  className={`bg-surface-container-low p-3 rounded flex flex-col justify-between relative${isError && !isOn ? ' border border-error/40 breathing-pulse' : ' border border-outline-variant'}`}>
                  <span className={`font-label-caps text-9px ${isError && !isOn ? 'text-error' : 'text-on-surface-variant'}`}>{meta.label}</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-12px font-mono ${isOn ? 'text-primary' : isError && !isOn ? 'text-error' : 'text-on-surface-variant opacity-50'}`}>
                      {isError && !isOn ? 'ERR' : isOn ? `${ch === 1 ? '75%' : ch === 4 ? 'ACTIVE' : 'ON'}` : 'OFF'}
                    </span>
                    {isError && !isOn ? (
                      <div className="w-8 h-4 bg-error/20 rounded-full relative border border-error/50 flex items-center justify-center">
                        <span className="text-10px text-error font-bold">!</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggle(ch)}
                        className={`w-8 h-4 rounded-full relative p-0.5 border transition-all cursor-pointer select-none
                          ${isOn ? `bg-${meta.color === 'secondary' ? 'secondary' : 'primary'}` : 'bg-outline-variant border-outline-variant'}`}
                        style={isOn ? { boxShadow: `0 0 8px ${meta.color === 'secondary' ? '#44e2cd' : '#6bfb9a'}` } : {}}
                      >
                        <div className={`w-3 h-3 rounded-full transition-all absolute top-0.5 ${isOn ? 'right-0.5 bg-on-primary' : 'left-0.5 bg-on-surface-variant'}`} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            <div className="col-span-full mt-2 h-36 bg-surface-container-lowest rounded border border-outline-variant relative overflow-hidden group">
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
