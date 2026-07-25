import { useState, useEffect, useCallback } from 'react'
import { getAlarms, acknowledgeAlarm, resolveAlarm } from '../../../api/client.js'
import { useSSE } from '../../../api/useSSE.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import EmptyState from '../../../shared/components/EmptyState.jsx'
import EntityHeader from '../../../shared/components/EntityHeader.jsx'
import Panel from '../../../shared/components/Panel.jsx'

const SEVERITY = {
  CRITICAL: { label: 'Crítico', color: 'var(--error-red)', icon: 'error', bg: 'rgba(239, 68, 68, 0.1)' },
  HIGH: { label: 'Alto', color: 'var(--amber)', icon: 'warning', bg: 'rgba(245, 158, 11, 0.1)' },
  MEDIUM: { label: 'Medio', color: 'var(--accent-blue, #60a5fa)', icon: 'info', bg: 'rgba(96, 165, 250, 0.1)' },
  LOW: { label: 'Bajo', color: 'var(--outline)', icon: 'info', bg: 'rgba(153, 153, 153, 0.1)' },
}

function AlarmRow({ alarm, onAcknowledge, onResolve }) {
  const sev = SEVERITY[alarm.severity] || SEVERITY.LOW
  const isActive = !alarm.resolvedAt
  return (
    <tr className="border-b border-outline-variant">
      <td className="p-3">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: sev.color }}>{sev.icon}</span>
          <span className="badge" style={{ background: sev.bg, color: sev.color, borderColor: `${sev.color}33` }}>
            {sev.label}
          </span>
        </div>
      </td>
      <td className="p-3">
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>{alarm.type}</span>
      </td>
      <td className="p-3">
        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{alarm.message}</span>
      </td>
      <td className="p-3">
        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
          {alarm.Device?.chamberName || alarm.Device?.deviceId || '—'}
        </span>
      </td>
      <td className="p-3">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--outline)' }}>
          {new Date(alarm.createdAt).toLocaleString()}
        </span>
      </td>
      <td className="p-3">
        {isActive ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            {!alarm.isAcknowledged && (
              <button
                onClick={() => onAcknowledge(alarm.id)}
                className="btn btn-secondary"
                style={{ fontSize: '10px', padding: '4px 8px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>
                ACK
              </button>
            )}
            <button
              onClick={() => onResolve(alarm.id)}
              className="btn btn-glow"
              style={{ fontSize: '10px', padding: '4px 8px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>task_alt</span>
              RESOLVE
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--spore-green)' }}>check_circle</span>
            <span style={{ fontSize: '9px', color: 'var(--outline)' }}>
              Resuelta el {new Date(alarm.resolvedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </td>
    </tr>
  )
}

function Alarms() {
  const [alarms, setAlarms] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState({ severity: '', status: 'active' })
  const [page, setPage] = useState(1)

  async function fetchAlarms() {
    try {
      setLoading(true)
      const params = { page, limit: 50 }
      if (filter.severity) params.severity = filter.severity
      if (filter.status) params.status = filter.status
      const { data, pagination: p } = await getAlarms(params)
      setAlarms(data)
      setPagination(p)
      setError(null)
    } catch (err) {
      setError(err.message || 'Error al cargar alarmas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlarms() }, [page, filter.severity, filter.status])

  useSSE(useCallback((type, data) => {
    if (type === 'alarm') {
      if (data.resolvedAt) {
        setAlarms(prev => prev.filter(a => a.id !== data.id))
      } else if (filter.status !== 'resolved') {
        setAlarms(prev => [data, ...prev].slice(0, 50))
      }
    }
  }, [filter.status]))

  async function handleAcknowledge(id) {
    try {
      await acknowledgeAlarm(id)
      setAlarms(prev => prev.map(a => a.id === id ? { ...a, isAcknowledged: true, acknowledgedAt: new Date().toISOString() } : a))
    } catch (err) {
      console.error('Error acknowledging alarm:', err)
    }
  }

  async function handleResolve(id) {
    try {
      await resolveAlarm(id)
      setAlarms(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      console.error('Error resolving alarm:', err)
    }
  }

  if (loading && alarms.length === 0) return <LoadingState message="Cargando alarmas..." icon="warning" />

  const activeCount = alarms.filter(a => !a.resolvedAt).length

  return (
    <div className="alarms-page">
      <EntityHeader
        title="Alarmas"
        subtitle={`${activeCount} activa${activeCount !== 1 ? 's' : ''} · ${pagination?.total || alarms.length} en total`}
      />

      {error && (
        <div className="alert-banner alert-banner-error" style={{ marginBottom: '16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      <Panel title="Filtros" subtitle={`${activeCount} alarma${activeCount !== 1 ? 's' : ''} activa${activeCount !== 1 ? 's' : ''}`}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label className="form-label">Severidad</label>
            <select
              value={filter.severity}
              onChange={e => { setFilter(f => ({ ...f, severity: e.target.value })); setPage(1) }}
              className="form-select"
              style={{ fontSize: '11px' }}
            >
              <option value="">Todas las severidades</option>
              <option value="CRITICAL">Crítico</option>
              <option value="HIGH">Alto</option>
              <option value="MEDIUM">Medio</option>
              <option value="LOW">Bajo</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label className="form-label">Estado</label>
            <select
              value={filter.status}
              onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(1) }}
              className="form-select"
              style={{ fontSize: '11px' }}
            >
              <option value="active">Activas</option>
              <option value="resolved">Resueltas</option>
              <option value="">Todas</option>
            </select>
          </div>
          {activeCount > 0 && (
            <div className="alert-banner alert-banner-error" style={{ padding: '4px 10px' }}>
              <span className="material-symbols-outlined pulse-error" style={{ fontSize: '14px', color: 'var(--error-red)' }}>warning</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--error-red)' }}>{activeCount} activa{activeCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </Panel>

      {alarms.length > 0 ? (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Severidad</th>
                <th>Tipo</th>
                <th>Mensaje</th>
                <th>Dispositivo</th>
                <th>Hora</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alarms.map(alarm => (
                <AlarmRow
                  key={alarm.id}
                  alarm={alarm}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="check_circle"
          title="Sin alarmas"
          message={filter.status === 'resolved' ? 'No se encontraron alarmas resueltas.' : filter.severity ? `Sin alarmas de severidad ${filter.severity.toLowerCase()}.` : 'Todos los sistemas funcionan correctamente.'}
        />
      )}

      {pagination && pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '10px' }}
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_left</span>
            ANT
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--outline)' }}>
            Página {pagination.page} de {pagination.pages}
          </span>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '10px' }}
            disabled={page >= pagination.pages}
            onClick={() => setPage(p => p + 1)}
          >
            SIG
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default Alarms
