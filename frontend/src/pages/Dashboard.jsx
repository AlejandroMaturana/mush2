import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getDevices, getLatestTelemetry } from '../api/client.js'
import { useSSE } from '../api/useSSE.js'
import MetricCard from '../components/dashboard/MetricCard.jsx'

function Dashboard() {
  const [devices, setDevices] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [telemetry, setTelemetry] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [alarms, setAlarms] = useState([])
  const [aggregate, setAggregate] = useState(null)

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

          const valid = allTel.filter(t => t && (t.temperature != null || t.humidity != null))
          if (valid.length > 1) {
            const avg = { devices: valid.length }
            const tVals = valid.filter(t => t.temperature != null).map(t => t.temperature)
            const hVals = valid.filter(t => t.humidity != null).map(t => t.humidity)
            if (tVals.length > 0) avg.tempAvg = tVals.reduce((a, b) => a + b, 0) / tVals.length
            if (hVals.length > 0) avg.humAvg = hVals.reduce((a, b) => a + b, 0) / hVals.length
            setAggregate(avg)
          } else {
            setAggregate(null)
          }
        } else {
          setSelectedId(null)
          setTelemetry({})
          setAggregate(null)
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
      if (dev && dev.id === selectedId) {
        setTelemetry(prev => ({
          ...prev,
          temperature: data.sensors?.temperature,
          humidity: data.sensors?.humidity,
          co2: data.sensors?.co2,
          voc: data.sensors?.voc,
          ts: new Date().toISOString(),
        }))
      }
    }
    if (type === 'alarm') {
      setAlarms(prev => [{ reason: data.reason, ts: data.ts }, ...prev].slice(0, 10))
    }
  }, [devices, selectedId]))

  if (loading) return <div className="loading">Conectando...</div>
  if (error && devices.length === 0) return <div className="error-state">{error}</div>

  const selectedDevice = devices.find(d => d.id === selectedId)

  return (
    <div className="dashboard">
      {alarms.length > 0 && (
        <section>
          <div className="alarms-panel">
            <h3>Alertas</h3>
            {alarms.map((a, i) => (
              <div key={i} className="alarm-item">
                <span className="alarm-reason">{a.reason}</span>
                <span className="alarm-time">{new Date(a.ts).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {aggregate && (
        <section>
          <h2 className="section-title">Promedio ({aggregate.devices} cámaras)</h2>
          <div className="metrics">
            {aggregate.tempAvg != null && (
              <MetricCard label="Temp. Promedio" value={aggregate.tempAvg} unit="°C" />
            )}
            {aggregate.humAvg != null && (
              <MetricCard label="HR Promedio" value={aggregate.humAvg} unit="%" />
            )}
          </div>
        </section>
      )}

      <section>
        <div className="device-selector-row">
          <h2 className="section-title">Cámara</h2>
          <select
            className="device-selector"
            value={selectedId || ''}
            onChange={e => setSelectedId(Number(e.target.value))}
          >
            {devices.map(d => (
              <option key={d.id} value={d.id}>
                {d.chamberName || d.deviceId}
              </option>
            ))}
          </select>
        </div>

        {telemetry && Object.keys(telemetry).length > 0 && (
          <div className="metrics" style={{ marginTop: 16 }}>
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
        )}

        {selectedDevice && (
          <Link to={`/devices/${selectedDevice.id}`} className="device-link" style={{ display: 'inline-block', marginTop: 12 }}>
            <span className="nav-link">Ver detalle →</span>
          </Link>
        )}
      </section>

      <section>
        <h2 className="section-title">Dispositivos</h2>
        {devices.length === 0 ? (
          <div className="empty-state">
            <p>No hay dispositivos registrados</p>
            <p style={{ marginTop: 8, fontSize: 13 }}>Esperando conexión de un controlador Mush2...</p>
          </div>
        ) : (
          <div className="metrics">
            {devices.map((d) => (
              <Link key={d.id} to={`/devices/${d.id}`} className="device-link">
                <div className={`device-card${d.id === selectedId ? ' device-card--active' : ''}`}>
                  <h3>{d.chamberName || d.deviceId}</h3>
                  <span className={`status ${d.status}`}>{d.status}</span>
                  {d.chamberName && <div className="device-meta"><span>ID: {d.deviceId}</span></div>}
                  <div className="device-meta">
                    <span>FW: {d.firmwareVersion}</span>
                    <span>MAC: {d.macAddress || '—'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Dashboard
