import { useState, useEffect, useCallback } from 'react'
import { getMetrics, getLogs } from '../api/monitoring.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import EntityHeader from '../../../shared/components/EntityHeader.jsx'
import Panel from '../../../shared/components/Panel.jsx'
import StatusCard from '../../../shared/components/StatusCard.jsx'
import DashboardGrid from '../../../shared/components/DashboardGrid.jsx'

function Monitoring() {
  const [metrics, setMetrics] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [logLevel, setLogLevel] = useState('')
  const [logModule, setLogModule] = useState('')
  const [logLimit, setLogLimit] = useState(50)

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await getMetrics()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err.message || 'Error al cargar métricas')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const data = await getLogs({ level: logLevel || undefined, module: logModule || undefined, limit: logLimit })
      setLogs(data)
    } catch (err) {
      console.error('Error fetching logs:', err)
    }
  }, [logLevel, logModule, logLimit])

  useEffect(() => {
    fetchMetrics()
    fetchLogs()
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [fetchMetrics, fetchLogs])

  if (loading) return <LoadingState message="Cargando monitoreo..." icon="monitoring" />

  const { uptime, version, readiness, system, db } = metrics || {}
  const memUsed = system?.memory ? Math.round((system.memory.heapUsed / 1024 / 1024) * 10) / 10 : '—'
  const memTotal = system?.memory ? Math.round((system.memory.heapTotal / 1024 / 1024) * 10) / 10 : '—'
  const loadAvg = system?.loadAvg ? system.loadAvg[0]?.toFixed(2) : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <EntityHeader
        title="Monitoreo del Sistema"
        subtitle="Estado de salud, métricas y logs del backend"
      />

      {error && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      <DashboardGrid columns={3}>
        <Panel title="Estado General" subtitle="Readiness del sistema">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <StatusCard
              status={readiness?.status === 'ready' ? 'online' : readiness?.status === 'degraded' ? 'warning' : 'offline'}
              title="Estado"
              subtitle={readiness?.status || '—'}
            />
            <StatusCard
              status="online"
              title="Uptime"
              subtitle={uptime ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m` : '—'}
            />
            <StatusCard
              status="online"
              title="Versión"
              subtitle={version || '—'}
            />
            <StatusCard
              status="online"
              title="Node.js"
              subtitle={system?.nodeVersion || '—'}
            />
          </div>
        </Panel>

        <Panel title="Sistema" subtitle="Recursos del servidor">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <StatusCard
              status={memUsed && memUsed > 400 ? 'warning' : 'online'}
              title="Memoria Heap"
              metric={`${memUsed} MB`}
              subtitle={`de ${memTotal} MB`}
            />
            <StatusCard
              status={loadAvg && parseFloat(loadAvg) > 2 ? 'warning' : 'online'}
              title="Load Average"
              subtitle={loadAvg || '—'}
            />
            <StatusCard
              status="online"
              title="CPU"
              subtitle={system?.cpu ? `${system.cpu} cores` : '—'}
            />
            <StatusCard
              status="online"
              title="Plataforma"
              subtitle={system?.platform || '—'}
            />
          </div>
        </Panel>

        <Panel title="Base de datos" subtitle="Estadísticas de PostgreSQL">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <StatusCard
              status="online"
              title="Dispositivos"
              metric={db?.deviceCount ?? '—'}
              subtitle={`${db?.onlineDevices ?? 0} online`}
            />
            <StatusCard
              status="online"
              title="Telemetría 24h"
              metric={db?.telemetry24h ?? '—'}
            />
            <StatusCard
              status="online"
              title="Eventos"
              metric={db?.eventCount ?? '—'}
            />
            <StatusCard
              status="online"
              title="Ciclos activos"
              metric={db?.activeCycles ?? '—'}
            />
          </div>
        </Panel>
      </DashboardGrid>

      <Panel title="Logs Recientes" subtitle="Logs estructurados del backend">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Nivel</label>
            <select className="form-select" style={{ fontSize: '11px' }} value={logLevel} onChange={e => setLogLevel(e.target.value)}>
              <option value="">Todos</option>
              <option value="trace">Trace</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
              <option value="fatal">Fatal</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Módulo</label>
            <input
              className="form-input"
              style={{ fontSize: '11px' }}
              placeholder="ej: MQTT, AUTH..."
              value={logModule}
              onChange={e => setLogModule(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Límite</label>
            <select className="form-select" style={{ fontSize: '11px' }} value={logLimit} onChange={e => setLogLimit(Number(e.target.value))}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <button className="btn btn-glow" style={{ fontSize: '10px', whiteSpace: 'nowrap' }} onClick={fetchLogs}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span>
            BUSCAR
          </button>
        </div>

        {logs.length > 0 ? (
          <div style={{ overflow: 'auto', maxHeight: '400px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Timestamp</th>
                  <th style={{ width: '60px' }}>Nivel</th>
                  <th style={{ width: '80px' }}>Módulo</th>
                  <th>Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--outline)' }}>
                        {log.time ? new Date(log.time).toLocaleString() : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600,
                        color: log.level === 'error' ? 'var(--error-red)' : log.level === 'warn' ? 'var(--amber)' : log.level === 'info' ? 'var(--spore-green)' : 'var(--outline)',
                      }}>
                        {log.level?.toUpperCase() || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--on-surface-variant)' }}>
                        {log.module || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', color: 'var(--on-surface)' }}>
                        {log.msg || '—'}
                      </span>
                      {log.error && (
                        <span style={{ fontSize: '10px', color: 'var(--error-red)', marginLeft: '8px' }}>
                          ({log.error})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--outline)', textAlign: 'center', padding: '32px 0' }}>Sin logs disponibles</p>
        )}
      </Panel>
    </div>
  )
}

export default Monitoring
