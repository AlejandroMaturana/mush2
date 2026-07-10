import { useState, useEffect } from 'react'
import { getAuditLogs } from '../api/client.js'
import LoadingState from '../components/ui/LoadingState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

const RESOURCE_OPTIONS = ['', 'user', 'device', 'sensor', 'actuator', 'recipe', 'cycle', 'alarm', 'api_key', 'system']
const ACTION_OPTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'USER_ROLE_CHANGE', 'USER_TOGGLE_ACTIVE', 'API_KEY_CREATE', 'API_KEY_REVOKE', 'API_KEY_ROTATE', 'PASSWORD_CHANGE']

function formatJSON(val) {
  if (!val) return '—'
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(val)
  }
}

function expandDetails(details) {
  const el = document.createElement('pre')
  el.className = 'text-10px text-on-surface bg-surface-dim p-2 rounded mt-1 overflow-x-auto max-h-40 whitespace-pre-wrap font-mono'
  el.textContent = formatJSON(details)
  return el
}

function Logs() {
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ resource: '', action: '', search: '', from: '', to: '' })
  const [expandedRows, setExpandedRows] = useState(new Set())

  async function fetchLogs(p = page) {
    setLoading(true)
    try {
      const params = { page: p, limit: 50 }
      if (filters.resource) params.resource = filters.resource
      if (filters.action) params.action = filters.action
      if (filters.search) params.search = filters.search
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      const data = await getAuditLogs(params)
      setLogs(data.data)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      setError(err.message || 'Error loading logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs(1) }, [])

  function handleFilterChange(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    fetchLogs(1)
  }

  function handleClearFilters() {
    setFilters({ resource: '', action: '', search: '', from: '', to: '' })
    setPage(1)
    fetchLogs(1)
  }

  function handlePage(newPage) {
    setPage(newPage)
    fetchLogs(newPage)
  }

  function toggleRow(id) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exportCSV() {
    const headers = ['Date', 'User', 'Action', 'Resource', 'Resource ID', 'Details', 'IP', 'User Agent']
    const rows = logs.map(log => [
      new Date(log.createdAt).toISOString(),
      log.user?.username || log.userId || '—',
      log.action,
      log.resource,
      log.resourceId || '—',
      JSON.stringify(log.details || {}),
      log.ip || '—',
      log.userAgent || '—',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasFilters = Object.values(filters).some(v => v)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-1">Audit Logs</h1>
          <p className="text-on-surface-variant text-body-md">Track all actions and changes in the system.</p>
        </div>
        <button className="btn btn-outline" onClick={exportCSV} disabled={logs.length === 0}>
          <span className="material-symbols-outlined text-16px">download</span>
          EXPORT CSV
        </button>
      </div>

      <form onSubmit={handleSearch} className="glass-card p-4 rounded-xl border border-outline-variant mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">RESOURCE</label>
            <select className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-2 text-body-sm text-on-surface cursor-pointer" value={filters.resource} onChange={e => handleFilterChange('resource', e.target.value)}>
              {RESOURCE_OPTIONS.map(o => <option key={o} value={o}>{o || 'All'}</option>)}
            </select>
          </div>
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">ACTION</label>
            <select className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-2 text-body-sm text-on-surface cursor-pointer" value={filters.action} onChange={e => handleFilterChange('action', e.target.value)}>
              {ACTION_OPTIONS.map(o => <option key={o} value={o}>{o || 'All'}</option>)}
            </select>
          </div>
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">FROM</label>
            <input type="date" className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-2 text-body-sm text-on-surface" value={filters.from} onChange={e => handleFilterChange('from', e.target.value)} />
          </div>
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">TO</label>
            <input type="date" className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-2 text-body-sm text-on-surface" value={filters.to} onChange={e => handleFilterChange('to', e.target.value)} />
          </div>
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">SEARCH</label>
            <input className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-2 text-body-sm text-on-surface" value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} placeholder="Search in details..." />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button type="submit" className="btn btn-primary btn-sm">APPLY FILTERS</button>
          {hasFilters && <button type="button" className="btn btn-outline btn-sm" onClick={handleClearFilters}>CLEAR</button>}
        </div>
      </form>

      {loading ? (
        <LoadingState message="Loading audit logs..." icon="history" />
      ) : error && logs.length === 0 ? (
        <ErrorState message={error} onRetry={() => fetchLogs(page)} />
      ) : logs.length === 0 ? (
        <EmptyState icon="history" title="No audit logs" message={hasFilters ? 'No logs match your filters.' : 'No audit events recorded yet.'} />
      ) : (
        <>
          <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="border-b border-outline-variant text-label-caps text-9px text-on-surface-variant">
                    <th className="p-3 w-8"></th>
                    <th className="p-3 font-weight-normal">Date</th>
                    <th className="p-3 font-weight-normal">User</th>
                    <th className="p-3 font-weight-normal">Action</th>
                    <th className="p-3 font-weight-normal">Resource</th>
                    <th className="p-3 font-weight-normal">Resource ID</th>
                    <th className="p-3 font-weight-normal">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-outline-variant hover:bg-surface-container-high transition-colors">
                      <td className="p-3">
                        <button className="text-on-surface-variant hover:text-on-surface" onClick={() => toggleRow(log.id)}>
                          <span className="material-symbols-outlined text-16px">{expandedRows.has(log.id) ? 'expand_less' : 'expand_more'}</span>
                        </button>
                      </td>
                      <td className="p-3 text-body-xs text-on-surface-variant whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-body-sm text-on-surface">
                        {log.user?.username || <span className="text-on-surface-variant">{log.userId || '—'}</span>}
                      </td>
                      <td className="p-3">
                        <span className={`font-label-caps text-10px px-2 py-0.5 rounded ${log.action?.includes('DELETE') || log.action?.includes('REVOKE') ? 'bg-error/20 text-error' : log.action?.includes('CREATE') || log.action?.includes('LOGIN') ? 'bg-primary/20 text-primary' : 'bg-tertiary/20 text-tertiary'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-data-sm text-on-surface font-mono">{log.resource}</td>
                      <td className="p-3 text-data-sm text-on-surface-variant font-mono">{log.resourceId || '—'}</td>
                      <td className="p-3 text-body-xs text-on-surface-variant font-mono">{log.ip || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {expandedRows.size > 0 && (
              <div className="border-t border-outline-variant divide-y divide-outline-variant/50">
                {logs.filter(l => expandedRows.has(l.id)).map(log => (
                  <div key={`detail-${log.id}`} className="p-4 bg-surface-dim">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-label-caps text-9px text-on-surface-variant mb-1">DETAILS</p>
                        <pre className="text-10px text-on-surface bg-surface-container-low p-3 rounded overflow-x-auto max-h-48 whitespace-pre-wrap font-mono">
                          {formatJSON(log.details)}
                        </pre>
                      </div>
                      <div>
                        <p className="font-label-caps text-9px text-on-surface-variant mb-1">USER AGENT</p>
                        <p className="text-10px text-on-surface-variant break-all">{log.userAgent || '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => handlePage(page - 1)}>PREV</button>
              <span className="text-body-sm text-on-surface-variant px-3">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              <button className="btn btn-sm btn-outline" disabled={page >= pagination.pages} onClick={() => handlePage(page + 1)}>NEXT</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Logs
