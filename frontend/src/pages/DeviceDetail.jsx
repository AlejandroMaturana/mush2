import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDevice, getLatestTelemetry, getActuators } from '../api/client.js'
import { useSSE } from '../api/useSSE.js'
import MetricCard from '../components/dashboard/MetricCard.jsx'
import ActuatorControl from '../components/device/ActuatorControl.jsx'

function DeviceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [telemetry, setTelemetry] = useState({})
  const [actuators, setActuators] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadData() {
    try {
      const [dev, tel, acts] = await Promise.all([
        getDevice(id),
        getLatestTelemetry(id),
        getActuators(id),
      ])
      setDevice(dev)
      setTelemetry(tel)
      setActuators(acts)
      setError(null)
    } catch (err) {
      setError(err.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id])

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
          const updated = [...prev];
          data.actuators.forEach(act => {
            const idx = updated.findIndex(a => a.channel === act.channel);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], state: act.state, mode: data.mode || updated[idx].mode };
            } else {
              updated.push({ channel: act.channel, state: act.state, type: 'SSR', mode: data.mode || 'LOCAL' });
            }
          });
          return updated;
        });
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

  if (loading) return <div className="loading">Conectando...</div>
  if (error) return <div className="error-state">{error}</div>
  if (!device) return <div className="error-state">Dispositivo no encontrado</div>

  return (
    <div className="device-detail">
      <button className="back-btn" onClick={() => navigate('/')}>← Volver</button>

      <div className="detail-header">
        <div>
          <h2>{device.deviceId}</h2>
          <span className={`device-status ${device.status}`}>{device.status}</span>
        </div>
        <div className="device-meta">
          <span>FW: {device.firmwareVersion}</span>
          <span>MAC: {device.macAddress}</span>
        </div>
      </div>

      {Object.keys(telemetry).length > 0 && (
        <section>
          <h3>Sensores</h3>
          <div className="metrics">
            {telemetry.temperature != null && (
              <MetricCard label="Temperatura" value={telemetry.temperature} unit="°C" ts={telemetry.ts} />
            )}
            {telemetry.humidity != null && (
              <MetricCard label="Humedad" value={telemetry.humidity} unit="%" ts={telemetry.ts} />
            )}
            {telemetry.co2 != null && (
              <MetricCard label="CO₂" value={telemetry.co2} unit="ppm" ts={telemetry.ts} />
            )}
            {telemetry.voc != null && (
              <MetricCard label="VOC" value={telemetry.voc} unit="ppb" ts={telemetry.ts} />
            )}
          </div>
        </section>
      )}

      <section>
        <h3>Actuadores</h3>
        <div className="actuators-grid">
          {[1, 2, 3].map(ch => {
            const act = actuators.find(a => a.channel === ch) || { channel: ch, state: 'OFF', mode: 'LOCAL' }
            return (
              <ActuatorControl
                key={ch}
                deviceId={id}
                actuator={act}
                onCommandSent={(channel, newState) => {
                  setActuators(prev => prev.map(a =>
                    a.channel === channel ? { ...a, state: newState } : a
                  ))
                }}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default DeviceDetail
