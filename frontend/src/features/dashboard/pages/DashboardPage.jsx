import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDevices, getLatestTelemetry } from '../../../api/client.js'
import { useSSE } from '../../../api/useSSE.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import ErrorState from '../../../shared/components/ErrorState.jsx'
import StatusBadge from '../../../shared/components/StatusBadge.jsx'
import EmptyState from '../../../shared/components/EmptyState.jsx'
import EntityHeader from '../../../shared/components/EntityHeader.jsx'
import DashboardGrid from '../../../shared/components/DashboardGrid.jsx'
import { getPrimaryStatus, getStatusCssClass } from '../../../shared/constants/deviceStatus.js'

function SummaryCard({ label, value, icon, iconClass }) {
  return (
    <div className="summary-card">
      <div className="summary-card-info">
        <span className="summary-card-label">{label}</span>
        <span className="summary-card-value">{value}</span>
      </div>
      <div className={`summary-card-icon ${iconClass}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
    </div>
  )
}

function DeviceRow({ device, telemetry }) {
  const navigate = useNavigate()
  const primary = getPrimaryStatus(device.status)
  const dotClass = primary.config.cssClass
  return (
    <tr
      className="card-clickable"
      onClick={() => navigate(`/fleet/devices/${device.id}`)}
    >
      <td style={{ padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className={`status-dot ${dotClass}`} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{device.chamberName || device.deviceId}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--outline)', marginTop: '2px' }}>
              {device.deviceId}
            </div>
          </div>
        </div>
      </td>
      <td style={{ padding: '12px' }}>
        <StatusBadge status={dotClass} label={primary.config.label} />
      </td>
      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
        {telemetry?.temperature != null ? (
          <span style={{ color: 'var(--spore-green)' }}>{telemetry.temperature.toFixed(1)}</span>
        ) : '--'}
        <span style={{ marginLeft: '2px', fontSize: '11px' }}>{telemetry?.temperature != null ? '°C' : ''}</span>
      </td>
      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
        {telemetry?.humidity != null ? (
          <span style={{ color: 'var(--teal)' }}>{telemetry.humidity.toFixed(1)}</span>
        ) : '--'}
        <span style={{ marginLeft: '2px', fontSize: '11px' }}>{telemetry?.humidity != null ? '%' : ''}</span>
      </td>
      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
        {telemetry?.co2 != null ? (
          <span>{telemetry.co2}</span>
        ) : '--'}
        <span style={{ marginLeft: '2px', fontSize: '11px' }}>{telemetry?.co2 != null ? 'ppm' : ''}</span>
      </td>
      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
        {telemetry?.voc != null ? (
          <span>{telemetry.voc}</span>
        ) : '--'}
        <span style={{ marginLeft: '2px', fontSize: '11px' }}>{telemetry?.voc != null ? 'ppb' : ''}</span>
      </td>
      <td style={{ padding: '12px', textAlign: 'right' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>chevron_right</span>
      </td>
    </tr>
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const [devices, setDevices] = useState([])
  const [telemetryMap, setTelemetryMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const cancelledRef = useRef(false)

  async function fetchData() {
    try {
      const devs = await getDevices()
      if (cancelledRef.current) return
      setDevices(devs)

      const allTel = await Promise.all(devs.map(d => getLatestTelemetry(d.id).catch(() => null)))
      if (cancelledRef.current) return

      const map = {}
      devs.forEach((d, i) => { map[d.id] = allTel[i] })
      setTelemetryMap(map)
      setError(null)
    } catch (err) {
      if (!cancelledRef.current) setError(err.message || 'Error de conexión')
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    cancelledRef.current = false
    fetchData()
    return () => { cancelledRef.current = true }
  }, [])

  useSSE(useCallback((type, data) => {
    if (type === 'telemetry') {
      const dev = devices.find(d => d.deviceId === data.deviceId)
      if (dev) {
        const update = {
          temperature: data.sensors?.temperature,
          humidity: data.sensors?.humidity,
          co2: data.sensors?.co2,
          voc: data.sensors?.voc,
        }
        setTelemetryMap(prev => ({ ...prev, [dev.id]: { ...prev[dev.id], ...update } }))
      }
    } else if (type === 'device_status_changed') {
      setDevices(prev => prev.map(d =>
        d.deviceId === data.deviceId
          ? { ...d, status: data.status, lastSeen: data.lastSeenAt }
          : d
      ))
    }
  }, [devices]))

  if (loading) return <LoadingState message="Conectando con el sistema..." icon="settings_ethernet" />
  if (error && devices.length === 0) {
    return <ErrorState message={error} onRetry={fetchData} />
  }

  const onlineCount = devices.filter(d => d.status?.connectivity === 'ONLINE').length
  const offlineCount = devices.filter(d => d.status?.connectivity === 'OFFLINE').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <EntityHeader
        title="Dispositivos de cultivo"
        subtitle={`${devices.length} dispositivo${devices.length !== 1 ? 's' : ''} registrado${devices.length !== 1 ? 's' : ''}${onlineCount > 0 ? ` · ${onlineCount} en línea` : ''}`}
        actions={
          <button onClick={() => navigate('/fleet/provision')} className="btn btn-glow" style={{ padding: '8px 16px', fontSize: '11px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            REGISTRAR DISPOSITIVO
          </button>
        }
      />

      {devices.length > 0 && (
        <DashboardGrid columns={4}>
          <SummaryCard label="Total dispositivos" value={devices.length} icon="devices" iconClass="blue" />
          <SummaryCard label="En línea" value={onlineCount} icon="wifi" iconClass="green" />
          <SummaryCard label="Fuera de línea" value={offlineCount} icon="wifi_off" iconClass="red" />
          <SummaryCard label="Temp. promedio" value={devices.length > 0 ? (Object.values(telemetryMap).filter(t => t?.temperature != null).reduce((sum, t) => sum + t.temperature, 0) / Math.max(Object.values(telemetryMap).filter(t => t?.temperature != null).length, 1)).toFixed(1) : '--'} icon="thermostat" iconClass="amber" />
        </DashboardGrid>
      )}

      {devices.length > 0 ? (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Dispositivo</th>
                <th>Estado</th>
                <th>Temperatura</th>
                <th>Humedad</th>
                <th>CO₂</th>
                <th>VOC</th>
                <th style={{ width: '40px' }} />
              </tr>
            </thead>
            <tbody>
              {devices.map(device => (
                <DeviceRow key={device.id} device={device} telemetry={telemetryMap[device.id]} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="sensors_off"
          title="Sin dispositivos registrados"
          message="Conecte su primera cámara Mush2 para comenzar la supervisión y control del ambiente de cultivo."
          action={{ label: 'Reintentar conexión', onClick: fetchData }}
        />
      )}
    </div>
  )
}

export default Dashboard
