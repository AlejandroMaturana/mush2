import { useState, useEffect } from 'react'
import { getApiKeys, createApiKey, rotateApiKey, deleteApiKey } from '../../api/client.js'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'

function KeyModal({ rawKey, name, onClose }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(rawKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback */ }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="glass-card p-8 rounded-xl border border-outline-variant max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-primary">vpn_key</span>
          <h3 className="text-headline-md text-on-surface">New API Key</h3>
        </div>
        <p className="text-body-sm text-on-surface-variant mb-4">
          {name ? `Key for: ${name}` : 'Copy this key now. You won\'t be able to see it again.'}
        </p>
        <div className="bg-surface-dim border border-outline-variant rounded p-3 mb-4 font-mono text-data-sm text-on-surface break-all select-all">
          {rawKey}
        </div>
        <div className="flex gap-3 justify-end">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handleCopy}>
            <span className="material-symbols-outlined text-16px">{copied ? 'check' : 'content_copy'}</span>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ApiKeysSettings() {
  const [keys, setKeys] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newKeyData, setNewKeyData] = useState(null)
  const [keyName, setKeyName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  async function fetchKeys() {
    try {
      const { data, pagination: p } = await getApiKeys()
      setKeys(data)
      setPagination(p)
      setError(null)
    } catch (err) {
      setError(err.message || 'Error loading API keys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchKeys() }, [])

  async function handleCreate() {
    try {
      const result = await createApiKey({ name: keyName || undefined })
      setNewKeyData({ rawKey: result.data.rawKey, name: keyName })
      setKeyName('')
      setShowCreate(false)
      await fetchKeys()
    } catch (err) {
      setError(err.message || 'Error creating key')
    }
  }

  async function handleRotate(id) {
    try {
      const result = await rotateApiKey(id)
      setNewKeyData({ rawKey: result.data.rawKey, name: result.data.name })
      await fetchKeys()
    } catch (err) {
      setError(err.message || 'Error rotating key')
    }
  }

  async function handleRevoke(id) {
    if (!window.confirm('Revoke this API key? This cannot be undone.')) return
    try {
      await deleteApiKey(id)
      await fetchKeys()
    } catch (err) {
      setError(err.message || 'Error revoking key')
    }
  }

  if (loading) return <LoadingState message="Loading API keys..." icon="vpn_key" />
  if (error && keys.length === 0) return <ErrorState message={error} onRetry={fetchKeys} />

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-1">API Keys</h1>
          <p className="text-on-surface-variant text-body-md">Manage API keys for programmatic access.</p>
        </div>
        {!showCreate ? (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <span className="material-symbols-outlined text-16px">add</span>
            NEW KEY
          </button>
        ) : null}
      </div>

      {showCreate && (
        <div className="glass-card p-5 rounded-xl border border-outline-variant mb-6">
          <h3 className="text-headline-md text-on-surface mb-4">Generate New API Key</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <p className="text-label-caps text-9px text-on-surface-variant mb-1">KEY NAME (OPTIONAL)</p>
              <input
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-body-md text-on-surface focus:border-primary outline-none"
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
                placeholder="e.g. CI/CD, ThingSpeak bridge"
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleCreate}>GENERATE</button>
            <button className="btn btn-outline" onClick={() => { setShowCreate(false); setKeyName('') }}>CANCEL</button>
          </div>
        </div>
      )}

      {keys.length > 0 ? (
        <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
          <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b border-outline-variant text-label-caps text-9px text-on-surface-variant">
                <th className="p-3 font-weight-normal">Name</th>
                <th className="p-3 font-weight-normal">Key</th>
                <th className="p-3 font-weight-normal">Status</th>
                <th className="p-3 font-weight-normal">Created</th>
                <th className="p-3 font-weight-normal">Last used</th>
                <th className="p-3 font-weight-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(key => (
                <tr key={key.id} className="border-b border-outline-variant">
                  <td className="p-3 text-body-sm text-on-surface">{key.name || '—'}</td>
                  <td className="p-3">
                    <span className="font-mono text-data-sm text-secondary">{key.keyPrefix}...</span>
                  </td>
                  <td className="p-3">
                    <span className={`status-badge ${key.isActive ? 'online' : 'offline'}`}>
                      {key.isActive ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="p-3 text-body-xs text-on-surface-variant">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-body-xs text-on-surface-variant">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {key.isActive && (
                        <>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleRotate(key.id)}
                          >
                            Rotate
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRevoke(key.id)}
                          >
                            Revoke
                          </button>
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
        <EmptyState icon="vpn_key" title="No API keys" message="Generate your first API key for programmatic access." />
      )}

      {newKeyData && (
        <KeyModal
          rawKey={newKeyData.rawKey}
          name={newKeyData.name}
          onClose={() => setNewKeyData(null)}
        />
      )}
    </div>
  )
}

export default ApiKeysSettings
