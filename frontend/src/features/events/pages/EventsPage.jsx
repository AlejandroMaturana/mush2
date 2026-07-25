import { useState, useEffect } from 'react'
import { getEvents, getDeviceEvents } from '../../../api/client.js'
import { getDevices } from '../../../api/client.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import EmptyState from '../../../shared/components/EmptyState.jsx'
import EntityHeader from '../../../shared/components/EntityHeader.jsx'

const EVENT_TYPES = [
  { value: '', label: 'Todos los tipos' },
  { value: 'ack', label: 'ACK' },
  { value: 'state', label: 'Estado' },
  { value: 'telemetry', label: 'Telemetría' },
  { value: 'alarm', label: 'Alarma' },
  { value: 'control_eval', label: 'Eval. de control' },
  { value: 'health', label: 'Salud' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'phase_transition', label: 'Transición de fase' },
]

const EVENT_TYPE_COLORS = {
  ack: '#4ade80',
  state: '#60a5fa',
  telemetry: '#a78bfa',
  alarm: '#f87171',
  control_eval: '#fbbf24',
  health: '#22d3ee',
  maintenance: '#fb923c',
  phase_transition: '#c084fc',
}

function Events() {
  const [events, setEvents] = useState([])
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 })
  const [typeFilter, setTypeFilter] = useState('')
  const [deviceFilter, setDeviceFilter] = useState('')

  async function load(page = 1) {
    try {
      setError(null)
      const params = { page, limit: 50 }
      if (typeFilter) params.type = typeFilter
      if (deviceFilter) params.deviceId = deviceFilter

      const [result] = await Promise.all([
        getEvents(params),
        devices.length === 0 ? getDevices() : Promise.resolve(null),
      ])

      setEvents(result.data || [])
      setPagination(result.pagination || { page: 1, limit: 50, total: 0, pages: 0 })

      if (devices.length === 0) {
        const devs = await getDevices()
        setDevices(devs)
      }
    } catch (err) {
      setError(err.message || 'Error al cargar los eventos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [typeFilter, deviceFilter])

  if (loading) return <LoadingState message="Cargando eventos..." icon="history" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <EntityHeader
        title="Eventos del sistema"
        subtitle={`${pagination.total} evento${pagination.total !== 1 ? 's' : ''}`}
      />

      {error && (
        <div className="alert-banner alert-banner-error">
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="form-select" style={{ fontSize: '11px' }}>
          {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={deviceFilter} onChange={e => setDeviceFilter(e.target.value)} className="form-select" style={{ fontSize: '11px' }}>
          <option value="">Todos los dispositivos</option>
          {devices.map(d => <option key={d.id} value={d.deviceId}>{d.chamberName || d.deviceId}</option>)}
        </select>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon="history"
          title="Sin eventos"
          message="Ningún evento del sistema coincide con los filtros."
        />
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Marca de tiempo</th>
                <th>Tipo</th>
                <th>Dispositivo</th>
                <th>Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev, i) => {
                const color = EVENT_TYPE_COLORS[ev.type] || 'var(--outline)'
                return (
                  <tr key={ev.id || i}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : '—'}
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                        {ev.type}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--on-surface)' }}>
                      {ev.Device?.chamberName || ev.Device?.deviceId || ev.deviceId || '—'}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--on-surface-variant)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.message || JSON.stringify(ev.payload || ev.data || '—')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => load(pagination.page - 1)} disabled={pagination.page <= 1} className="btn btn-secondary" style={{ fontSize: '11px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
            Ant
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
            Página {pagination.page} de {pagination.pages}
          </span>
          <button onClick={() => load(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="btn btn-secondary" style={{ fontSize: '11px' }}>
            Sig
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default Events
