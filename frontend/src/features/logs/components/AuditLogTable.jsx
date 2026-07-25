import { useState } from 'react'

function formatJSON(val) {
  if (!val) return '—'
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(val)
  }
}

function AuditLogTable({ logs = [] }) {
  const [expandedId, setExpandedId] = useState(null)

  if (logs.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="border-b border-outline-variant text-label-caps text-9px text-on-surface-variant">
            <th className="p-3 font-weight-normal">Tiempo</th>
            <th className="p-3 font-weight-normal">Usuario</th>
            <th className="p-3 font-weight-normal">Acción</th>
            <th className="p-3 font-weight-normal">Recurso</th>
            <th className="p-3 font-weight-normal">Detalles</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} className="border-b border-outline-variant hover:bg-surface-container-highest/20 transition-colors">
              <td className="p-3 text-body-xs text-on-surface-variant whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString()}
              </td>
              <td className="p-3 text-body-sm text-on-surface">{log.User?.username || '—'}</td>
              <td className="p-3">
                <span className="text-tag-sm text-primary">{log.action}</span>
              </td>
              <td className="p-3 text-body-sm text-on-surface-variant">{log.resource}</td>
              <td className="p-3">
                {log.details ? (
                  <button
                    className="btn btn-sm btn-ghost text-8px"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <span className="material-symbols-outlined text-10px">
                      {expandedId === log.id ? 'expand_less' : 'expand_more'}
                    </span>
                    {expandedId === log.id ? 'Ocultar' : 'Mostrar'}
                  </button>
                ) : '—'}
              </td>
            </tr>
          )).filter(Boolean)}
        </tbody>
      </table>
    </div>
  )
}

export default AuditLogTable
