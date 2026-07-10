import { useState, useEffect } from 'react'
import { getSystemSettings, updateSystemSettings, seedSystemSettings } from '../../api/client.js'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'

const CATEGORY_LABELS = {
  installation: 'Installation',
  timing: 'Timing',
  storage: 'Storage',
  environment: 'Environment',
  states: 'States',
  alarms: 'Alarms',
  integration: 'Integration',
  ota: 'OTA',
}

const CATEGORY_ORDER = ['installation', 'timing', 'storage', 'environment', 'states', 'alarms', 'integration', 'ota']

function SystemSettings() {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [seedMsg, setSeedMsg] = useState(null)

  async function fetchSettings() {
    try {
      const data = await getSystemSettings()
      setSettings(data)
      setError(null)
    } catch (err) {
      setError(err.message || 'Error loading system settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSettings() }, [])

  function handleChange(key, value) {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s))
  }

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      const payload = settings.map(s => ({ key: s.key, value: s.value }))
      await updateSystemSettings(payload)
      setMsg({ type: 'ok', text: 'System settings saved' })
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.error || err.message || 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  async function handleSeed() {
    if (!window.confirm('Restore default system settings? This will add any missing defaults.')) return
    setSeedMsg(null)
    try {
      await seedSystemSettings()
      await fetchSettings()
      setSeedMsg({ type: 'ok', text: 'Defaults seeded' })
    } catch (err) {
      setSeedMsg({ type: 'err', text: err.message || 'Failed to seed' })
    }
  }

  function renderSettingInput(s) {
    switch (s.type) {
      case 'boolean':
        return (
          <input type="checkbox" className="toggle-checkbox" checked={s.value === 'true' || s.value === true} onChange={e => handleChange(s.key, String(e.target.checked))} />
        )
      case 'number':
        return (
          <input type="number" className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-body-md text-on-surface font-mono focus:border-primary outline-none" value={s.value} onChange={e => handleChange(s.key, e.target.value)} />
        )
      default:
        return (
          <input className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-body-md text-on-surface font-mono focus:border-primary outline-none" value={s.value} onChange={e => handleChange(s.key, e.target.value)} />
        )
    }
  }

  if (loading) return <LoadingState message="Loading system settings..." icon="settings" />
  if (error && settings.length === 0) return <ErrorState message={error} onRetry={fetchSettings} />

  const grouped = {}
  for (const s of settings) {
    const cat = s.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-1">System Settings</h1>
          <p className="text-on-surface-variant text-body-md">Global configuration parameters (SUPER_ADMIN only).</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline" onClick={handleSeed}>RESTORE DEFAULTS</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'SAVING...' : 'SAVE ALL'}</button>
        </div>
      </div>

      {msg && <p className={`mb-4 text-body-md ${msg.type === 'ok' ? 'text-primary' : 'text-error'}`}>{msg.text}</p>}
      {seedMsg && <p className={`mb-4 text-body-md ${seedMsg.type === 'ok' ? 'text-primary' : 'text-error'}`}>{seedMsg.text}</p>}

      {settings.length === 0 ? (
        <EmptyState icon="settings" title="No settings" message="Seed the system settings to get started.">
          <button className="btn btn-primary mt-4" onClick={handleSeed}>SEED DEFAULTS</button>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.filter(c => grouped[c]).map(cat => (
            <div key={cat} className="glass-card p-5 rounded-xl border border-outline-variant">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-secondary">category</span>
                <h3 className="font-label-caps text-label-caps text-on-surface-variant">{CATEGORY_LABELS[cat] || cat}</h3>
              </div>
              <div className="space-y-3">
                {grouped[cat].map(s => (
                  <div key={s.key} className="flex items-center justify-between p-3 bg-surface-container-low rounded">
                    <div className="flex-1 mr-4">
                      <p className="font-label-caps text-9px text-on-surface-variant">{s.label || s.key}</p>
                      {s.description && <p className="text-10px text-on-surface-variant mt-0.5">{s.description}</p>}
                      <p className="text-10px text-outline-variant mt-0.5 font-mono">{s.key}</p>
                    </div>
                    <div className="w-48 shrink-0">
                      {renderSettingInput(s)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SystemSettings
