import { useState, useEffect } from 'react'
import { getAuditLogs } from '../../../api/client.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'

const RESOURCE_OPTIONS = ['', 'user', 'device', 'sensor', 'actuator', 'recipe', 'cycle', 'alarm', 'api_key', 'system']
const ACTION_OPTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'USER_ROLE_CHANGE', 'USER_TOGGLE_ACTIVE', 'API_KEY_CREATE', 'API_KEY_REVOKE', 'API_KEY_ROTATE', 'PASSWORD_CHANGE']

const ACTION_STYLES = {
  CREATE: { bg: 'rgba(var(--spore-green-rgb), 0.15)', color: 'var(--spore-green)', border: 'rgba(var(--spore-green-rgb), 0.3)' },
  LOGIN: { bg: 'rgba(var(--spore-green-rgb), 0.15)', color: 'var(--spore-green)', border: 'rgba(var(--spore-green-rgb), 0.3)' },
  UPDATE: { bg: 'rgba(96, 165, 250, 0.15)', color: 'var(--accent-blue, #60a5fa)', border: 'rgba(96, 165, 250, 0.3)' },
  DELETE: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--error-red)', border: 'rgba(239, 68, 68, 0.3)' },
  REVOKE: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--error-red)', border: 'rgba(239, 68, 68, 0.3)' },
  LOGOUT: { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--amber)', border: 'rgba(245, 158, 11, 0.3)' },
}

function getActionStyle(action) {
  if (!action) return { bg: 'rgba(153, 153, 153, 0.1)', color: 'var(--outline)', border: 'rgba(153, 153, 153, 0.3)' }
  if (ACTION_STYLES[action]) return ACTION_STYLES[action]
  if (action.includes('DELETE') || action.includes('REVOKE')) return ACTION_STYLES.DELETE
  if (action.includes('CREATE') || action.includes('LOGIN')) return ACTION_STYLES.CREATE
  return { bg: 'rgba(167, 139, 250, 0.15)', color: 'var(--accent-purple, #a78bfa)', border: 'rgba(167, 139, 250, 0.3)' }
}

function formatJSON(val) {
  if (!val) return '—'
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(val)
  }
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
      setError(err.message || 'Error al cargar registros')
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
    const headers = ['Fecha', 'Usuario', 'Acción', 'Recurso', 'ID Recurso', 'Detalles', 'IP', 'Agente de usuario']
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="gradient-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Registros de auditoría</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--outline)' }}>
            {pagination?.total || logs.length} eventos · seguimiento de todas las acciones del sistema
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV} disabled={logs.length === 0} style={{ fontSize: '10px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
          EXPORTAR CSV
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* Filters */}
      <form onSubmit={handleSearch} className="glass-card" style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Recurso</label>
            <select className="form-select" style={{ fontSize: '11px' }} value={filters.resource} onChange={e => handleFilterChange('resource', e.target.value)}>
              {RESOURCE_OPTIONS.map(o => <option key={o} value={o}>{o || 'Todos'}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Acción</label>
            <select className="form-select" style={{ fontSize: '11px' }} value={filters.action} onChange={e => handleFilterChange('action', e.target.value)}>
              {ACTION_OPTIONS.map(o => <option key={o} value={o}>{o || 'Todas'}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Desde</label>
            <input type="date" className="form-input" style={{ fontSize: '11px' }} value={filters.from} onChange={e => handleFilterChange('from', e.target.value)} />
          </div>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Hasta</label>
            <input type="date" className="form-input" style={{ fontSize: '11px' }} value={filters.to} onChange={e => handleFilterChange('to', e.target.value)} />
          </div>
          <div style={{ gridColumn: 'span 1' }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Buscar</label>
            <input className="form-input" style={{ fontSize: '11px' }} value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} placeholder="Buscar en detalles..." />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button type="submit" className="btn btn-glow" style={{ fontSize: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>search</span>
            APLICAR FILTROS
          </button>
          {hasFilters && (
            <button type="button" className="btn btn-secondary" style={{ fontSize: '10px' }} onClick={handleClearFilters}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>clear_all</span>
              LIMPIAR
            </button>
          )}
        </div>
      </form>

      {/* Table */}
      {loading ? (
        <LoadingState message="Cargando registros de auditoría..." icon="history" />
      ) : logs.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)', marginBottom: '16px', display: 'block' }}>history</span>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '8px' }}>Sin registros de auditoría</h3>
          <p style={{ fontSize: '13px', color: 'var(--outline)' }}>
            {hasFilters ? 'Ningún registro coincide con tus filtros.' : 'Aún no se han registrado eventos de auditoría.'}
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '32px' }}></th>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Recurso</th>
                <th>ID Recurso</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const actionStyle = getActionStyle(log.action)
                const isExpanded = expandedRows.has(log.id)
                return (
                  <tr key={log.id}>
                    <td className="p-3">
                      <button onClick={() => toggleRow(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--outline)' }}>
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--outline)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--on-surface)' }}>
                        {log.user?.username || <span style={{ color: 'var(--outline)' }}>{log.userId || '—'}</span>}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                        background: actionStyle.bg, color: actionStyle.color, border: `1px solid ${actionStyle.border}`
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--on-surface)' }}>{log.resource}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--on-surface-variant)' }}>{log.resourceId || '—'}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--outline)' }}>{log.ip || '—'}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Expanded details */}
          {logs.filter(l => expandedRows.has(l.id)).length > 0 && (
            <div style={{ borderTop: '1px solid var(--outline-variant)' }}>
              {logs.filter(l => expandedRows.has(l.id)).map(log => (
                <div key={`detail-${log.id}`} style={{ padding: '16px', background: 'rgba(var(--surface-container-rgb, 28, 27, 31), 0.5)', borderBottom: '1px solid var(--outline-variant)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '6px' }}>Detalles</span>
                      <pre style={{
                        fontSize: '10px', color: 'var(--on-surface)', background: 'var(--surface-container-low, rgba(28, 27, 31, 0.5))',
                        padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)',
                        overflowX: 'auto', maxHeight: '192px', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)',
                        margin: 0,
                      }}>
                        {formatJSON(log.details)}
                      </pre>
                    </div>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '6px' }}>Agente de usuario</span>
                      <p style={{ fontSize: '10px', color: 'var(--on-surface-variant)', wordBreak: 'break-all' }}>
                        {log.userAgent || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
          <button className="btn btn-secondary" style={{ fontSize: '10px' }} disabled={page <= 1} onClick={() => handlePage(page - 1)}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_left</span>
            ANTERIOR
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--outline)' }}>
            Página {pagination.page} de {pagination.pages} ({pagination.total} total)
          </span>
          <button className="btn btn-secondary" style={{ fontSize: '10px' }} disabled={page >= pagination.pages} onClick={() => handlePage(page + 1)}>
            SIGUIENTE
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default Logs
