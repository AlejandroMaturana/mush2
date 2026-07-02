import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDevice, getActuators } from '../api/client.js'
import { useSSE } from '../api/useSSE.js'
import Gauge from '../components/ui/Gauge.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import TerminalLog from '../components/ui/TerminalLog.jsx'
import ActuatorControl from '../components/device/ActuatorControl.jsx'

function DeviceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [telemetry, setTelemetry] = useState({})
  const [actuators, setActuators] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const [dev, acts] = await Promise.all([
          getDevice(id),
          getActuators(id),
        ])
        if (cancelled) return
        setDevice(dev)
        setActuators(acts)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Connection error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [id])

  useSSE(useCallback((type, data) => {
    if (type === 'ack') {
      setActuators(prev => prev.map(a =>
        a.channel === data.actuatorState?.channel
          ? { ...a, state: data.actuatorState.state, lastAck: data.status }
          : a
      ))
    }
    if (type === 'state' && device && data.deviceId === device.deviceId) {
      if (data.actuators) {
        setActuators(prev => {
          const updated = [...prev]
          data.actuators.forEach(act => {
            const idx = updated.findIndex(a => a.channel === act.channel)
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], state: act.state, mode: data.mode || updated[idx].mode }
            } else {
              updated.push({ channel: act.channel, state: act.state, type: 'SSR', mode: data.mode || 'LOCAL' })
            }
          })
          return updated
        })
      }
    }
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
  }, [device]))

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
        <button className="mt-4 px-5 py-2 bg-error/20 border border-error/40 text-error font-label-caps rounded-md" onClick={() => window.location.reload()}>
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
  const hasCO2 = telemetry.co2 != null
  const hasTemp = telemetry.temperature != null
  const hasHum = telemetry.humidity != null

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate('/')}
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
          <div className="flex gap-4 mt-1">
            <span className="text-data-sm text-on-surface-variant">FIRMWARE: v{device.firmwareVersion || '—'}</span>
            <span className="text-data-sm text-on-surface-variant">MAC: {device.macAddress || '—'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2 rounded-lg hover:brightness-110 transition-all font-bold" style={{ border: 'none', cursor: 'pointer' }}>
            NEW CYCLE
          </button>
          <button className="border border-outline text-on-surface font-label-caps text-label-caps px-4 py-2 rounded-lg hover:bg-surface-variant transition-all font-bold" style={{ background: 'none', cursor: 'pointer' }}>
            CALIBRATE
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-container p-4 rounded-card border border-outline-variant flex flex-col items-center justify-center relative">
          <span className="absolute top-3 left-4 font-label-caps text-9px text-on-surface-variant">TEMPERATURE</span>
          <div className="mt-6">
            <Gauge variant="half" value={hasTemp ? telemetry.temperature : 0} min={10} max={40} unit="°C" size="sm" />
          </div>
          <span className="font-label-caps text-9px text-on-surface-variant mt-1">OPTIMAL RANGE</span>
        </div>
        <div className="bg-surface-container p-4 rounded-card border border-outline-variant flex flex-col items-center justify-center relative">
          <span className="absolute top-3 left-4 font-label-caps text-9px text-on-surface-variant">HUMIDITY</span>
          <div className="mt-6">
            <Gauge variant="half" value={hasHum ? telemetry.humidity : 0} min={50} max={100} unit="%" size="sm" />
          </div>
          <span className="font-label-caps text-9px text-on-surface-variant mt-1">FRUITING PHASE</span>
        </div>
        <div className={`bg-surface-container p-4 rounded-card border flex flex-col items-center justify-center relative${hasCO2 && telemetry.co2 > 1000 ? ' border-error/40' : ' border-outline-variant'}`}>
          <span className="absolute top-3 left-4 font-label-caps text-9px text-on-surface-variant">CO2 LEVELS</span>
          <div className="mt-6">
            <Gauge variant="half" value={hasCO2 ? Math.min(telemetry.co2, 3000) / 30 : 0} min={0} max={100} unit="" size="sm" />
          </div>
          <span className={`font-label-caps text-9px mt-1 ${hasCO2 && telemetry.co2 > 1000 ? 'text-error' : 'text-on-surface-variant'}`}>
            {hasCO2 ? telemetry.co2 > 1000 ? 'ABOVE THRESHOLD' : 'NOMINAL' : 'NO DATA'}
          </span>
        </div>
        <div className="bg-surface-container p-4 rounded-card border border-outline-variant flex flex-col items-center justify-center relative">
          <span className="absolute top-3 left-4 font-label-caps text-9px text-on-surface-variant">O2 CONTENT</span>
          <div className="mt-6">
            <Gauge variant="half" value={20} min={15} max={25} unit="%" size="sm" />
          </div>
          <span className="font-label-caps text-9px text-on-surface-variant mt-1">NOMINAL</span>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-[200px">
        <div className="bg-surface-container border border-outline-variant rounded-card p-4 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="font-label-caps text-10px text-on-surface">CO2 vs VENTILATION</span>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                <span className="text-9px font-label-caps text-on-surface-variant">CO2</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
                <span className="text-9px font-label-caps text-on-surface-variant">VENT</span>
              </div>
            </div>
          </div>
          <div className="flex-1 relative border border-outline-variant/20 rounded overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(to right, rgba(134,148,134,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(134,148,134,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            <div className="absolute inset-x-0" style={{ bottom: '20%', top: '40%', background: 'rgba(107,251,154,0.05)', borderTop: '1px solid rgba(107,251,154,0.1)', borderBottom: '1px solid rgba(107,251,154,0.1)' }} />
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M 0 60 L 10 58 L 20 62 L 30 40 L 40 38 L 50 42 L 60 45 L 70 85 L 80 88 L 90 86 L 100 87" fill="none" stroke="var(--spore-green)" strokeWidth="1.5" />
              <path d="M 0 100 L 0 70 L 10 72 L 20 68 L 30 75 L 40 70 L 50 65 L 60 30 L 70 25 L 80 32 L 90 35 L 100 30 L 100 100 Z" fill="rgba(68, 226, 205, 0.15)" stroke="var(--teal)" strokeWidth="1" />
            </svg>
            <div className="absolute bottom-1 left-1 text-8px font-mono text-on-surface-variant">03/28 16:00</div>
            <div className="absolute bottom-1 right-1 text-8px font-mono text-on-surface-variant">03/30 08:00</div>
          </div>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-card p-4 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="font-label-caps text-10px text-on-surface">TEMP vs HUMIDITY</span>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
                <span className="text-9px font-label-caps text-on-surface-variant">TEMP</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                <span className="text-9px font-label-caps text-on-surface-variant">HUM</span>
              </div>
            </div>
          </div>
          <div className="flex-1 relative border border-outline-variant/20 rounded overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(to right, rgba(134,148,134,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(134,148,134,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            <div className="absolute inset-x-0" style={{ bottom: '10%', top: '30%', background: 'rgba(68,226,205,0.05)', borderTop: '1px solid rgba(68,226,205,0.1)', borderBottom: '1px solid rgba(68,226,205,0.1)' }} />
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M 0 40 L 20 42 L 40 38 L 50 20 L 60 22 L 80 25 L 100 24" fill="none" stroke="var(--teal)" strokeWidth="1.5" />
              <path d="M 0 100 L 0 80 L 20 82 L 40 78 L 50 50 L 60 52 L 80 55 L 100 54 L 100 100 Z" fill="rgba(107, 251, 154, 0.15)" stroke="var(--spore-green)" strokeWidth="1" />
            </svg>
            <div className="absolute bottom-1 left-1 text-8px font-mono text-on-surface-variant">03/28 16:00</div>
            <div className="absolute bottom-1 right-1 text-8px font-mono text-on-surface-variant">03/30 08:00</div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(ch => {
          const act = actuators.find(a => a.channel === ch) || { channel: ch, state: 'OFF', mode: 'LOCAL' }
          return (
            <ActuatorControl
              key={ch}
              deviceId={device.deviceId}
              actuator={act}
              onCommandSent={(channel, newState) => {
                setActuators(prev => prev.map(a =>
                  a.channel === channel ? { ...a, state: newState } : a
                ))
              }}
            />
          )
        })}
      </section>
    </div>
  )
}

export default DeviceDetail
