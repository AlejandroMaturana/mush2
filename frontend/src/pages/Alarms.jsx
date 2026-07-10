import { useState, useEffect, useCallback } from 'react'
import { getAlarms, acknowledgeAlarm, resolveAlarm } from '../api/client.js'
import { useSSE } from '../api/useSSE.js'
import LoadingState from '../components/ui/LoadingState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

const severityLabel = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }
const severityClass = { CRITICAL: 'text-error', HIGH: 'text-warning', MEDIUM: 'text-info', LOW: 'text-on-surface-variant' }

function AlarmRow({ alarm, onAcknowledge, onResolve }) {
  const isActive = !alarm.resolvedAt
  return (
    <tr className="border-b border-outline-variant">
      <td className="p-3">
        <span className={`font-mono text-tag-sm ${severityClass[alarm.severity]} uppercase`}>
          {severityLabel[alarm.severity]}
        </span>
      </td>
      <td className="p-3 text-body-sm text-on-surface">{alarm.type}</td>
      <td className="p-3 text-body-sm text-on-surface-variant">{alarm.message}</td>
      <td className="p-3 text-body-sm text-on-surface-variant">
        {alarm.Device?.chamberName || alarm.Device?.deviceId || '—'}
      </td>
      <td className="p-3 text-body-xs text-on-surface-variant">
        {new Date(alarm.createdAt).toLocaleString()}
      </td>
      <td className="p-3">
        {isActive ? (
          <div className="flex gap-2">
            {!alarm.isAcknowledged && (
              <button
                className="btn btn-sm btn-outline"
                onClick={() => onAcknowledge(alarm.id)}
              >
                Ack
              </button>
            )}
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onResolve(alarm.id)}
            >
              Resolve
            </button>
          </div>
        ) : (
          <span className="text-body-xs text-on-surface-variant">
            Resolved {new Date(alarm.resolvedAt).toLocaleString()}
          </span>
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

  if (loading && alarms.length === 0) return <LoadingState message="Loading alarms..." icon="warning" />
  if (error && alarms.length === 0) return <ErrorState message={error} onRetry={fetchAlarms} />

  return (
    <div className="alarms-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-headline-lg text-on-surface">Alarms</h1>
        <div className="flex gap-3">
          <select
            className="select"
            value={filter.severity}
            onChange={e => { setFilter(f => ({ ...f, severity: e.target.value })); setPage(1) }}
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select
            className="select"
            value={filter.status}
            onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(1) }}
          >
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="">All</option>
          </select>
        </div>
      </div>

      {alarms.length > 0 ? (
        <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
          <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b border-outline-variant text-label-caps text-9px text-on-surface-variant">
                <th className="p-3 font-weight-normal">Severity</th>
                <th className="p-3 font-weight-normal">Type</th>
                <th className="p-3 font-weight-normal">Message</th>
                <th className="p-3 font-weight-normal">Device</th>
                <th className="p-3 font-weight-normal">Time</th>
                <th className="p-3 font-weight-normal">Actions</th>
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
        <EmptyState message="No alarms" icon="warning" />
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            className="btn btn-sm btn-outline"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span className="text-body-sm text-on-surface-variant self-center">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="btn btn-sm btn-outline"
            disabled={page >= pagination.pages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default Alarms
