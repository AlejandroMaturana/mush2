import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardSummary } from '../../../api/client.js'
import { useSSE } from '../../../api/useSSE.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import ErrorState from '../../../shared/components/ErrorState.jsx'
import StatusBadge from '../../../shared/components/StatusBadge.jsx'
import EmptyState from '../../../shared/components/EmptyState.jsx'
import EntityHeader from '../../../shared/components/EntityHeader.jsx'
import DashboardGrid from '../../../shared/components/DashboardGrid.jsx'
import { PRIMARY_STATUS_CONFIG } from '../../../shared/components/CameraStatus.jsx'

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
  // D1/T8: consume el primario derivado por el backend (D2). El frontend NO
  // reimplementa la precedencia; solo mapea presentación por primaryStatus.
  const cfg = PRIMARY_STATUS_CONFIG[device.primaryStatus] || PRIMARY_STATUS_CONFIG['DATOS_NO_DISPONIBLES']
  const label = device.primaryLabel || device.primaryStatus || 'Datos no disponibles'
  const tone = cfg.tone
  return (
    <tr
      className="card-clickable"
      onClick={() => navigate(`/fleet/devices/${device.deviceId}`)}
    >
      <td style={{ padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className={`status-dot ${tone}`} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{device.chamberName || device.deviceId}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--outline)', marginTop: '2px' }}>
              {device.deviceId}
            </div>
          </div>
        </div>
      </td>
      <td style={{ padding: '12px' }}>
        <StatusBadge status={tone} label={label} />
        {device.primaryReason && (
          <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
            {device.primaryReason}
          </div>
        )}
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
      // D1/T9: una única petición agregada devuelve estado D2 + última
      // telemetría por cámara (elimina el N+1 de getLatestTelemetry).
      const devs = await getDashboardSummary()
      if (cancelledRef.current) return

      const map = {}
      devs.forEach(d => { map[d.id] = d.latestTelemetry || {} })
      setDevices(devs)
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
      // D1/T8: el derivado (primaryStatus) vive en backend; el evento SSE solo
      // trae `status`. Se re-fetcha el resumen agregado (D1/T9) para no
      // recomputar la precedencia en frontend ni repetir N+1.
      getDashboardSummary().then(devs => {
        if (cancelledRef.current) return
        const map = {}
        devs.forEach(d => { map[d.id] = d.latestTelemetry || {} })
        setDevices(devs)
        setTelemetryMap(map)
      }).catch(() => {})
    }
  }, [devices]))

  if (loading) return <LoadingState message="Conectando con el sistema..." icon="settings_ethernet" />
  if (error && devices.length === 0) {
    return <ErrorState message={error} onRetry={fetchData} />
  }

  // D1/T8 — los resúmenes se agregan por primaryStatus (estado derivado D2),
  // NO por ejes crudos: así RETIRADA/EN MANTENIMIENTO/PROVISIONANDO no se
  // malclasifican y cada cámara se cuenta según su estado principal (M0.2 §12).
  const onlineSet = new Set(['OPERATIVA', 'AVISO'])
  const offlineSet = new Set(['SIN CONEXIÓN', 'RETIRADA'])
  const onlineCount = devices.filter(d => onlineSet.has(d.primaryStatus)).length
  const offlineCount = devices.filter(d => offlineSet.has(d.primaryStatus)).length

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
