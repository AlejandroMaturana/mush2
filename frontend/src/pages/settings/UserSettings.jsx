import { useState, useEffect } from 'react'
import { useAuth } from '../../api/AuthContext.jsx'
import { getProfile, updateProfileSettings, changePassword, linkTelegram, getTelegramStatus, unlinkTelegram } from '../../api/client.js'
import { useTheme } from '../../contexts/ThemeContext.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'

function UserSettings() {
  const { user } = useAuth()
  const { theme, setThemeMode } = useTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [prefs, setPrefs] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMsg, setPwMsg] = useState(null)
  const [pwSaving, setPwSaving] = useState(false)

  const [telegramStatus, setTelegramStatus] = useState(null)
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [telegramCode, setTelegramCode] = useState(null)
  const [telegramMsg, setTelegramMsg] = useState(null)

  async function loadProfile() {
    try {
      const data = await getProfile()
      setUsername(data.user.username)
      setEmail(data.user.email)
      setPrefs(data.preferences)
      setError(null)
    } catch (err) {
      setError(err.message || 'Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfile() }, [])

  async function loadTelegramStatus() {
    try {
      const st = await getTelegramStatus()
      setTelegramStatus(st)
      setTelegramCode(null)
    } catch { }
  }

  useEffect(() => {
    if (!loading) loadTelegramStatus()
  }, [loading])

  async function handleLinkTelegram() {
    setTelegramLoading(true)
    setTelegramMsg(null)
    try {
      const result = await linkTelegram()
      if (result.linked) {
        setTelegramStatus(result)
        setTelegramMsg({ type: 'ok', text: 'Already linked' })
      } else {
        setTelegramCode(result.code)
        setTelegramStatus({ linked: false })
        setTelegramMsg({ type: 'ok', text: `Send /link ${result.code} to @Mush2Bot on Telegram` })
      }
    } catch (err) {
      setTelegramMsg({ type: 'err', text: err.response?.data?.error || err.message })
    } finally {
      setTelegramLoading(false)
    }
  }

  async function handleUnlinkTelegram() {
    setTelegramLoading(true)
    try {
      await unlinkTelegram()
      setTelegramStatus({ linked: false })
      setTelegramCode(null)
      setTelegramMsg({ type: 'ok', text: 'Telegram unlinked' })
    } catch (err) {
      setTelegramMsg({ type: 'err', text: err.response?.data?.error || err.message })
    } finally {
      setTelegramLoading(false)
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const data = await updateProfileSettings({ username, email })
      setMsg({ type: 'ok', text: 'Profile updated' })
      sessionStorage.setItem('mush2_user', JSON.stringify(data.user))
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.error || err.message || 'Failed to update' })
    } finally {
      setSaving(false)
    }
  }

  function handlePrefChange(key, value) {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }

  async function handleSavePreferences() {
    setSaving(true)
    setMsg(null)
    try {
      await updateProfileSettings({ preferences: prefs })
      setMsg({ type: 'ok', text: 'Preferences saved' })
      if (prefs.theme) setThemeMode(prefs.theme)
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.error || err.message || 'Failed to save preferences' })
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'err', text: 'Passwords do not match' })
      return
    }
    if (newPassword.length < 6) {
      setPwMsg({ type: 'err', text: 'Password must be at least 6 characters' })
      return
    }
    setPwSaving(true)
    setPwMsg(null)
    try {
      await changePassword(currentPassword, newPassword)
      setPwMsg({ type: 'ok', text: 'Password changed successfully' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwMsg({ type: 'err', text: err.response?.data?.error || err.message || 'Failed to change password' })
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading profile..." icon="fingerprint" />
  if (error) return <ErrorState message={error} onRetry={loadProfile} />

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-headline-lg text-on-surface mb-1">User Settings</h1>
        <p className="text-on-surface-variant text-body-md">Profile, security, and preferences.</p>
      </div>

      <form onSubmit={handleSaveProfile} className="glass-card p-6 rounded-xl border border-outline-variant">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-secondary">badge</span>
          <h3 className="font-label-caps text-label-caps text-secondary">PROFILE</h3>
        </div>
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-lg border-2 border-primary/30 p-1 mb-3 bg-surface-container-low flex items-center justify-center">
            <span className="material-symbols-outlined text-40px text-primary">person</span>
          </div>
          <p className="text-data-sm text-secondary">{user?.role || '—'}</p>
        </div>
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">USERNAME</label>
            <input className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">EMAIL</label>
            <input className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          {msg && <p className={`text-body-md ${msg.type === 'ok' ? 'text-primary' : 'text-error'}`}>{msg.text}</p>}
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-on-primary font-label-caps text-label-caps rounded hover:opacity-90 disabled:opacity-40 transition-all">{saving ? 'SAVING...' : 'SAVE PROFILE'}</button>
        </div>
      </form>

      {prefs && (
        <div className="glass-card p-6 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-secondary">tune</span>
            <h3 className="font-label-caps text-label-caps text-secondary">PREFERENCES</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">THEME</label>
              <select className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2.5 text-body-md text-on-surface cursor-pointer" value={prefs.theme} onChange={e => { handlePrefChange('theme', e.target.value); setThemeMode(e.target.value) }}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">LANGUAGE</label>
              <select className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2.5 text-body-md text-on-surface cursor-pointer" value={prefs.language} onChange={e => handlePrefChange('language', e.target.value)}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">DATE FORMAT</label>
              <select className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2.5 text-body-md text-on-surface cursor-pointer" value={prefs.dateFormat} onChange={e => handlePrefChange('dateFormat', e.target.value)}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">DEFAULT DASHBOARD</label>
              <select className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2.5 text-body-md text-on-surface cursor-pointer" value={prefs.defaultDashboard} onChange={e => handlePrefChange('defaultDashboard', e.target.value)}>
                <option value="overview">Overview</option>
                <option value="devices">Devices</option>
                <option value="cycles">Cycles</option>
                <option value="alarms">Alarms</option>
              </select>
            </div>
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">REFRESH FREQUENCY (ms)</label>
              <input type="number" className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2.5 text-body-md text-on-surface focus:border-primary outline-none" value={prefs.refreshFrequency} onChange={e => handlePrefChange('refreshFrequency', Number(e.target.value))} step="1000" min="1000" />
            </div>
            <div>
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">MIN ALERT SEVERITY</label>
              <select className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2.5 text-body-md text-on-surface cursor-pointer" value={prefs.minAlertSeverity} onChange={e => handlePrefChange('minAlertSeverity', e.target.value)}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical only</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded">
              <span className="font-label-caps text-9px text-on-surface-variant">PUSH NOTIFICATIONS</span>
              <input type="checkbox" className="toggle-checkbox" checked={prefs.pushNotifications} onChange={e => handlePrefChange('pushNotifications', e.target.checked)} />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded">
              <span className="font-label-caps text-9px text-on-surface-variant">ALERT SOUNDS</span>
              <input type="checkbox" className="toggle-checkbox" checked={prefs.alertSounds} onChange={e => handlePrefChange('alertSounds', e.target.checked)} />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded">
              <span className="font-label-caps text-9px text-on-surface-variant">EMAIL ALERTS</span>
              <input type="checkbox" className="toggle-checkbox" checked={prefs.emailAlerts} onChange={e => handlePrefChange('emailAlerts', e.target.checked)} />
            </div>
            <div className="md:col-span-2">
              <label className="font-label-caps text-9px text-on-surface-variant block mb-1">WEBHOOK URL (for notifications)</label>
              <input className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2.5 text-body-md text-on-surface font-mono focus:border-primary outline-none" value={prefs.webhookUrl || ''} onChange={e => handlePrefChange('webhookUrl', e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="mt-6">
            <button onClick={handleSavePreferences} disabled={saving} className="px-6 py-2.5 bg-primary text-on-primary font-label-caps text-label-caps rounded hover:opacity-90 disabled:opacity-40 transition-all">{saving ? 'SAVING...' : 'SAVE PREFERENCES'}</button>
          </div>
        </div>
      )}

      <div className="glass-card p-6 rounded-xl border border-outline-variant">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-secondary">send</span>
          <h3 className="font-label-caps text-label-caps text-secondary">TELEGRAM</h3>
        </div>
        <div className="max-w-lg">
          {telegramStatus?.linked ? (
            <div>
              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded mb-4">
                <span className="text-primary text-body-md">✅</span>
                <div>
                  <p className="text-body-md text-on-surface">Linked to Telegram</p>
                  <p className="text-body-sm text-on-surface-variant">Chat ID: {telegramStatus.chatId}</p>
                </div>
              </div>
              <button onClick={handleUnlinkTelegram} disabled={telegramLoading} className="px-6 py-2.5 bg-error text-on-error font-label-caps text-label-caps rounded hover:opacity-90 disabled:opacity-40 transition-all">
                {telegramLoading ? 'PROCESSING...' : 'UNLINK TELEGRAM'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-body-md text-on-surface-variant mb-4">
                Link your Telegram account to receive real-time alerts from your devices.
              </p>
              {telegramCode && (
                <div className="p-4 bg-surface-container-lowest rounded border border-outline-variant mb-4">
                  <p className="font-label-caps text-9px text-on-surface-variant mb-1">SEND THIS CODE TO @Mush2Bot</p>
                  <p className="text-data-lg text-primary font-mono tracking-wider">{telegramCode}</p>
                  <p className="text-body-sm text-on-surface-variant mt-2">Send <code className="bg-surface-container-low px-1 rounded">/link {telegramCode}</code> to @Mush2Bot on Telegram</p>
                </div>
              )}
              {telegramMsg && <p className={`text-body-md mb-4 ${telegramMsg.type === 'ok' ? 'text-primary' : 'text-error'}`}>{telegramMsg.text}</p>}
              <button onClick={handleLinkTelegram} disabled={telegramLoading} className="px-6 py-2.5 bg-primary text-on-primary font-label-caps text-label-caps rounded hover:opacity-90 disabled:opacity-40 transition-all">
                {telegramLoading ? 'PROCESSING...' : telegramCode ? 'REFRESH CODE' : 'LINK TELEGRAM'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-6 rounded-xl border border-outline-variant">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-secondary">lock</span>
          <h3 className="font-label-caps text-label-caps text-secondary">CHANGE PASSWORD</h3>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">CURRENT PASSWORD</label>
            <input type="password" className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-body-md text-on-surface focus:border-primary outline-none" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">NEW PASSWORD</label>
            <input type="password" className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-body-md text-on-surface focus:border-primary outline-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">CONFIRM NEW PASSWORD</label>
            <input type="password" className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-body-md text-on-surface focus:border-primary outline-none" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          {pwMsg && <p className={`text-body-md ${pwMsg.type === 'ok' ? 'text-primary' : 'text-error'}`}>{pwMsg.text}</p>}
          <button type="submit" disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword} className="px-6 py-2.5 bg-primary text-on-primary font-label-caps text-label-caps rounded hover:opacity-90 disabled:opacity-40 transition-all">{pwSaving ? 'CHANGING...' : 'CHANGE PASSWORD'}</button>
        </form>
      </div>
    </div>
  )
}

export default UserSettings
