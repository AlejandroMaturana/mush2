import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDevices, deleteDevice } from '../../../api/client.js'
import { useSSE } from '../../../api/useSSE.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import EmptyState from '../../../shared/components/EmptyState.jsx'
import EntityHeader from '../../../shared/components/EntityHeader.jsx'
import { getPrimaryStatus, CONNECTIVITY, LIFECYCLE } from '../../../shared/constants/deviceStatus.js'

function formatTimeAgo(seconds) {
  if (seconds == null) return 'Nunca'
  if (seconds < 5) return 'Hace un momento'
  if (seconds < 60) return `Hace ${seconds}s`
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}m`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `Hace ${h}h ${m}m`
}

function DeviceList() {
  const navigate = useNavigate()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    try {
      setError(null)
      const data = await getDevices()
      setDevices(data)
    } catch (err) {
      setError(err.message || 'Error al cargar los dispositivos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useSSE(useCallback((type, data) => {
    if (type === 'device_status_changed') {
      setDevices(prev => prev.map(d =>
        d.deviceId === data.deviceId
          ? { ...d, status: data.status, lastSeen: data.lastSeenAt }
          : d
      ))
    }
  }, []))

  async function handleDelete() {
    if (!showDeleteModal) return
    setDeleting(true)
    try {
      await deleteDevice(showDeleteModal.id)
      setShowDeleteModal(null)
      await load()
    } catch (err) {
      setError(err.message || 'Error al eliminar el dispositivo')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = devices.filter(d => {
    if (statusFilter) {
      const s = d.status
      if (!s) return false
      if (statusFilter === 'ONLINE' && s.connectivity !== 'ONLINE') return false
      if (statusFilter === 'DEGRADED' && s.connectivity !== 'DEGRADED') return false
      if (statusFilter === 'OFFLINE' && s.connectivity !== 'OFFLINE') return false
      if (statusFilter === 'MAINTENANCE' && s.lifecycle !== 'MAINTENANCE') return false
      if (statusFilter === 'ERROR' && s.health !== 'ERROR') return false
    }
    if (search) {
      const q = search.toLowerCase()
      return (
        (d.deviceId || '').toLowerCase().includes(q) ||
        (d.chamberName || '').toLowerCase().includes(q) ||
        (d.macAddress || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const onlineCount = devices.filter(d => d.status?.connectivity === 'ONLINE').length
  const degradedCount = devices.filter(d => d.status?.connectivity === 'DEGRADED').length
  const offlineCount = devices.filter(d => d.status?.connectivity === 'OFFLINE').length

  if (loading) return <LoadingState message="Cargando dispositivos..." icon="devices" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <EntityHeader
        title="Lista de dispositivos"
        subtitle={`${devices.length} dispositivo${devices.length !== 1 ? 's' : ''} · ${onlineCount} en línea${degradedCount > 0 ? ` · ${degradedCount} degradado${degradedCount !== 1 ? 's' : ''}` : ''}${offlineCount > 0 ? ` · ${offlineCount} fuera de línea` : ''}`}
        actions={
          <Link to="/fleet/provision" className="btn btn-glow" style={{ fontSize: '11px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>bluetooth</span>
            APROVISIONAR
          </Link>
        }
      />

      {error && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por ID, nombre o dirección MAC..."
          className="form-input"
          style={{ flex: 1, minWidth: '200px', fontSize: '12px' }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select" style={{ fontSize: '11px' }}>
          <option value="">Todos los estados</option>
          <option value="ONLINE">En línea</option>
          <option value="DEGRADED">Degradado</option>
          <option value="OFFLINE">Fuera de línea</option>
          <option value="MAINTENANCE">Mantenimiento</option>
          <option value="ERROR">Error de salud</option>
        </select>
      </div>

      {devices.length === 0 ? (
        <EmptyState
          icon="devices"
          title="Sin dispositivos"
          message="No hay dispositivos registrados. Comience aprovisionando uno nuevo."
          action={{ label: 'APROVISIONAR DISPOSITIVO', onClick: () => navigate('/fleet/provision') }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="Sin coincidencias"
          message="Ningún dispositivo coincide con los criterios de búsqueda."
        />
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Dispositivo</th>
                <th>Cámara</th>
                <th>Estado</th>
                <th>Firmware</th>
                <th>Última conexión</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const primary = getPrimaryStatus(d.status)
                const st = primary.config
                return (
                  <tr key={d.id}>
                    <td>
                      <Link to={`/fleet/devices/${d.deviceId}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--spore-green)', textDecoration: 'none', fontWeight: 600 }}>
                        {d.deviceId}
                      </Link>
                      {d.macAddress && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', display: 'block' }}>{d.macAddress}</span>}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--on-surface)' }}>{d.chamberName || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                        border: `1px solid ${st.border}`,
                        background: st.bg,
                        color: st.color,
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.color }} />
                        {st.label}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                      {d.firmwareVersion || '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                      <span title={d.lastSeen ? new Date(d.lastSeen).toLocaleString() : 'Nunca'}>
                        {formatTimeAgo(d.secondsSinceLastSeen)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Link to={`/fleet/devices/${d.deviceId}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--outline)' }}>visibility</span>
                        </Link>
                        <button onClick={() => setShowDeleteModal(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--error-red)' }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(null)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--error-red)' }}>warning</span>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--on-surface)', textAlign: 'center' }}>Eliminar dispositivo</h2>
              <p style={{ fontSize: '13px', color: 'var(--outline)', textAlign: 'center', lineHeight: 1.5 }}>
                ¿Está seguro de que desea eliminar <strong style={{ color: 'var(--on-surface)' }}>{showDeleteModal.chamberName || showDeleteModal.deviceId}</strong>?
                Esta acción eliminará todos los datos asociados, incluyendo ciclos, telemetría e historial de actuadores.
              </p>
              <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px' }}>
                <button onClick={() => setShowDeleteModal(null)} disabled={deleting} className="btn btn-secondary" style={{ flex: 1, fontSize: '12px' }}>Cancelar</button>
                <button onClick={handleDelete} disabled={deleting} className="btn btn-danger" style={{ flex: 1, fontSize: '12px' }}>
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeviceList
