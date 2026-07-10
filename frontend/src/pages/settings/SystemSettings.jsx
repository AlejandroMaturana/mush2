import { useState, useEffect } from 'react'
import { getSystemSettings, updateSystemSettings, seedSystemSettings, configureTelegramBot, getTelegramBotStatus } from '../../api/client.js'
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
  const [tgToken, setTgToken] = useState('')
  const [tgUsername, setTgUsername] = useState('')
  const [tgStatus, setTgStatus] = useState(null)
  const [tgSaving, setTgSaving] = useState(false)
  const [tgMsg, setTgMsg] = useState(null)

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

  async function loadTgStatus() {
    try {
      const st = await getTelegramBotStatus()
      setTgStatus(st)
    } catch {}
  }

  useEffect(() => {
    if (!loading) {
      loadTgStatus()
      const tgTok = settings.find(s => s.key === 'telegram_bot_token')
      const tgUser = settings.find(s => s.key === 'telegram_bot_username')
      if (tgTok) setTgToken(tgTok.value)
      if (tgUser) setTgUsername(tgUser.value)
    }
  }, [loading, settings])

  async function handleConfigureTelegram(e) {
    e.preventDefault()
    if (!tgToken) return
    setTgSaving(true)
    setTgMsg(null)
    try {
      const result = await configureTelegramBot(tgToken, tgUsername)
      setTgStatus({ running: result.running, username: result.username, tokenConfigured: true, configuredUsername: tgUsername, lastError: result.lastError })
      setTgMsg({ type: result.running ? 'ok' : 'err', text: result.running ? 'Bot initialized successfully' : `Bot failed: ${result.lastError || 'unknown error'}` })
    } catch (err) {
      setTgMsg({ type: 'err', text: err.response?.data?.error || err.message })
    } finally {
      setTgSaving(false)
    }
  }

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

      <div className="glass-card p-5 rounded-xl border border-outline-variant mt-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-secondary">send</span>
          <h3 className="font-label-caps text-label-caps text-on-surface-variant">TELEGRAM BOT</h3>
        </div>

        {tgStatus && (
          <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded mb-4">
            <span className={`text-body-md ${tgStatus.running ? 'text-primary' : 'text-error'}`}>
              {tgStatus.running ? '●' : '○'}
            </span>
            <div>
              <p className="text-body-md text-on-surface">{tgStatus.running ? 'Bot running' : 'Bot stopped'}</p>
              {tgStatus.username && <p className="text-body-sm text-on-surface-variant">@{tgStatus.username}</p>}
              {tgStatus.lastError && <p className="text-body-sm text-error">Error: {tgStatus.lastError}</p>}
            </div>
          </div>
        )}

        <form onSubmit={handleConfigureTelegram} className="space-y-4 max-w-lg">
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">BOT TOKEN</label>
            <input type="password" className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2.5 text-body-md text-on-surface font-mono focus:border-primary outline-none" value={tgToken} onChange={e => setTgToken(e.target.value)} placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" autoComplete="off" />
          </div>
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">BOT USERNAME</label>
            <input className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2.5 text-body-md text-on-surface font-mono focus:border-primary outline-none" value={tgUsername} onChange={e => setTgUsername(e.target.value)} placeholder="MyMush2Bot" />
          </div>
          {tgMsg && <p className={`text-body-md ${tgMsg.type === 'ok' ? 'text-primary' : 'text-error'}`}>{tgMsg.text}</p>}
          <button type="submit" disabled={tgSaving || !tgToken} className="px-6 py-2.5 bg-primary text-on-primary font-label-caps text-label-caps rounded hover:opacity-90 disabled:opacity-40 transition-all">{tgSaving ? 'INITIALIZING...' : 'SAVE & INITIALIZE BOT'}</button>
        </form>

        <details className="mt-4">
          <summary className="font-label-caps text-9px text-on-surface-variant cursor-pointer">How to create a Telegram bot?</summary>
          <div className="mt-3 p-3 bg-surface-container-low rounded text-body-sm text-on-surface-variant space-y-1">
            <p>1. Open Telegram and search for <strong>@BotFather</strong></p>
            <p>2. Send <code className="bg-surface-container-lowest px-1 rounded font-mono">/newbot</code></p>
            <p>3. Choose a display name (e.g. <em>My Mush2 Bot</em>)</p>
            <p>4. Choose a username ending in <em>Bot</em> (e.g. <em>MyMush2Bot</em>)</p>
            <p>5. Copy the <strong>HTTP API token</strong> BotFather gives you</p>
            <p>6. Paste it in the <strong>Bot Token</strong> field above and save</p>
            <p className="mt-2 text-10px text-outline">Token format: <code className="font-mono">1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-123456</code></p>
          </div>
        </details>
      </div>
    </div>
  )
}

export default SystemSettings
