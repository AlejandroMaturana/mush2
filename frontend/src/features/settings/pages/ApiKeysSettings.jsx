import { useState, useEffect } from 'react'
import { getApiKeys, createApiKey, rotateApiKey, deleteApiKey } from '../../../api/client.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'

function KeyModal({ rawKey, name, onClose }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() { try { await navigator.clipboard.writeText(rawKey); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {} }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--spore-green)' }}>vpn_key</span>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)' }}>Nueva clave API</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span></button>
        </div>
        <div style={{ padding: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--outline)', marginBottom: '12px' }}>{name ? `Clave para: ${name}` : 'Copia esta clave ahora. No podrás verla de nuevo.'}</p>
          <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--on-surface)', wordBreak: 'break-all', userSelect: 'all', marginBottom: '16px' }}>{rawKey}</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" style={{ fontSize: '10px' }} onClick={onClose}>Cerrar</button>
            <button className="btn btn-glow" style={{ fontSize: '10px' }} onClick={handleCopy}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{copied ? 'check' : 'content_copy'}</span>
              {copied ? '¡Copiada!' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ApiKeysSettings() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newKeyData, setNewKeyData] = useState(null)
  const [keyName, setKeyName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  async function fetchKeys() {
    try { const { data } = await getApiKeys(); setKeys(data); setError(null) }
    catch (err) { setError(err.message || 'Error al cargar') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchKeys() }, [])

  async function handleCreate() {
    try { const result = await createApiKey({ name: keyName || undefined }); setNewKeyData({ rawKey: result.data.rawKey, name: keyName }); setKeyName(''); setShowCreate(false); await fetchKeys() }
    catch (err) { setError(err.message || 'Error al crear') }
  }

  async function handleRotate(id) {
    try { const result = await rotateApiKey(id); setNewKeyData({ rawKey: result.data.rawKey, name: result.data.name }); await fetchKeys() }
    catch (err) { setError(err.message || 'Error al rotar') }
  }

  async function handleRevoke(id) {
    if (!window.confirm('¿Revocar esta clave API? Esta acción no se puede deshacer.')) return
    try { await deleteApiKey(id); await fetchKeys() }
    catch (err) { setError(err.message || 'Error al revocar') }
  }

  if (loading) return <LoadingState message="Cargando claves API..." icon="vpn_key" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="gradient-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Claves API</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--outline)' }}>Gestiona claves API para acceso programático</p>
        </div>
        {!showCreate && (
          <button className="btn btn-glow" style={{ fontSize: '10px' }} onClick={() => setShowCreate(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span> NUEVA CLAVE
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '12px' }}>Generar nueva clave API</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Nombre de la clave (opcional)</label>
              <input className="form-input" style={{ fontSize: '11px' }} value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="ej. CI/CD, ThingSpeak bridge" onKeyDown={e => { if (e.key === 'Enter') handleCreate() }} />
            </div>
            <button className="btn btn-glow" style={{ fontSize: '10px' }} onClick={handleCreate}>GENERAR</button>
            <button className="btn btn-secondary" style={{ fontSize: '10px' }} onClick={() => { setShowCreate(false); setKeyName('') }}>CANCELAR</button>
          </div>
        </div>
      )}

      {/* Keys Table */}
      {keys.length > 0 ? (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Clave</th>
                <th>Estado</th>
                <th>Creada</th>
                <th>Último uso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(key => (
                <tr key={key.id}>
                  <td><span style={{ fontSize: '13px', color: 'var(--on-surface)' }}>{key.name || '—'}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-blue, #60a5fa)' }}>{key.keyPrefix}...</span></td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                      background: key.isActive ? 'rgba(var(--spore-green-rgb), 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: key.isActive ? 'var(--spore-green)' : 'var(--error-red)',
                      border: `1px solid ${key.isActive ? 'rgba(var(--spore-green-rgb), 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    }}>{key.isActive ? 'Activa' : 'Revocada'}</span>
                  </td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--outline)' }}>{new Date(key.createdAt).toLocaleDateString()}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--outline)' }}>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Nunca'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {key.isActive && (
                        <>
                          <button className="btn btn-secondary" style={{ fontSize: '9px', padding: '4px 8px' }} onClick={() => handleRotate(key.id)}>Rotar</button>
                          <button className="btn btn-danger" style={{ fontSize: '9px', padding: '4px 8px' }} onClick={() => handleRevoke(key.id)}>Revocar</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)', marginBottom: '16px', display: 'block' }}>vpn_key</span>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '8px' }}>Sin claves API</h3>
          <p style={{ fontSize: '13px', color: 'var(--outline)' }}>Genera tu primera clave API para acceso programático.</p>
        </div>
      )}

      {newKeyData && <KeyModal rawKey={newKeyData.rawKey} name={newKeyData.name} onClose={() => setNewKeyData(null)} />}
    </div>
  )
}

export default ApiKeysSettings
