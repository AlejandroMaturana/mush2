import { useState, useEffect } from 'react'
import { useAuth } from '../../../api/AuthContext.jsx'
import { getProfile, updateProfileSettings, changePassword, linkTelegram, getTelegramStatus, unlinkTelegram } from '../../../api/client.js'
import { useTheme } from '../../../app/providers/ThemeProvider.jsx'
import LoadingState from '../../../shared/components/LoadingState.jsx'

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
      setError(err.message || 'Error al cargar perfil')
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

  useEffect(() => { if (!loading) loadTelegramStatus() }, [loading])

  async function handleLinkTelegram() {
    setTelegramLoading(true); setTelegramMsg(null)
    try {
      const result = await linkTelegram()
      if (result.linked) { setTelegramStatus(result); setTelegramMsg({ type: 'ok', text: 'Ya vinculado' }) }
      else { setTelegramCode(result.code); setTelegramStatus({ linked: false }); setTelegramMsg({ type: 'ok', text: `Envía /link ${result.code} a @Mush2Bot en Telegram` }) }
    } catch (err) { setTelegramMsg({ type: 'err', text: err.response?.data?.error || err.message }) }
    finally { setTelegramLoading(false) }
  }

  async function handleUnlinkTelegram() {
    setTelegramLoading(true)
    try { await unlinkTelegram(); setTelegramStatus({ linked: false }); setTelegramCode(null); setTelegramMsg({ type: 'ok', text: 'Telegram desvinculado' }) }
    catch (err) { setTelegramMsg({ type: 'err', text: err.response?.data?.error || err.message }) }
    finally { setTelegramLoading(false) }
  }

  async function handleSaveProfile(e) {
    e.preventDefault(); setSaving(true); setMsg(null)
    try { await updateProfileSettings({ username, email }); setMsg({ type: 'ok', text: 'Perfil actualizado' }); sessionStorage.setItem('mush2_user', JSON.stringify({ user: { username, email } })) }
    catch (err) { setMsg({ type: 'err', text: err.response?.data?.error || err.message || 'Falló' }) }
    finally { setSaving(false) }
  }

  function handlePrefChange(key, value) { setPrefs(prev => ({ ...prev, [key]: value })) }

  async function handleSavePreferences() {
    setSaving(true); setMsg(null)
    try { await updateProfileSettings({ preferences: prefs }); setMsg({ type: 'ok', text: 'Preferencias guardadas' }); if (prefs.theme) setThemeMode(prefs.theme) }
    catch (err) { setMsg({ type: 'err', text: err.response?.data?.error || err.message || 'Falló' }) }
    finally { setSaving(false) }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setPwMsg({ type: 'err', text: 'Las contraseñas no coinciden' }); return }
    if (newPassword.length < 6) { setPwMsg({ type: 'err', text: 'La contraseña debe tener al menos 6 caracteres' }); return }
    setPwSaving(true); setPwMsg(null)
    try { await changePassword(currentPassword, newPassword); setPwMsg({ type: 'ok', text: 'Contraseña cambiada correctamente' }); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }
    catch (err) { setPwMsg({ type: 'err', text: err.response?.data?.error || err.message || 'Falló' }) }
    finally { setPwSaving(false) }
  }

  if (loading) return <LoadingState message="Cargando perfil..." icon="fingerprint" />

  const SectionHeader = ({ icon, title }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--spore-green)' }}>{icon}</span>
      <span className="section-label">{title}</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>
      {/* Profile */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <SectionHeader icon="badge" title="Perfil" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '12px', border: '2px solid rgba(var(--spore-green-rgb), 0.3)', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--spore-green)' }}>person</span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--spore-green)' }}>{user?.role || '—'}</span>
        </div>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
          <div>
            <label className="form-label">Nombre de usuario</label>
            <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Correo electrónico</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          {msg && <p style={{ fontSize: '12px', color: msg.type === 'ok' ? 'var(--spore-green)' : 'var(--error-red)', fontWeight: 600 }}>{msg.text}</p>}
          <button type="submit" disabled={saving} className="btn btn-glow" style={{ fontSize: '10px', alignSelf: 'flex-start' }}>{saving ? 'GUARDANDO...' : 'GUARDAR PERFIL'}</button>
        </form>
      </div>

      {/* Preferences */}
      {prefs && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <SectionHeader icon="tune" title="Preferencias" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '560px' }}>
            {[
              { label: 'Tema', key: 'theme', type: 'select', options: [{ v: 'dark', l: 'Oscuro' }, { v: 'light', l: 'Claro' }] },
              { label: 'Idioma', key: 'language', type: 'select', options: [{ v: 'es', l: 'Español' }, { v: 'en', l: 'English' }] },
              { label: 'Formato de fecha', key: 'dateFormat', type: 'select', options: [{ v: 'DD/MM/YYYY', l: 'DD/MM/YYYY' }, { v: 'MM/DD/YYYY', l: 'MM/DD/YYYY' }, { v: 'YYYY-MM-DD', l: 'YYYY-MM-DD' }] },
              { label: 'Panel predeterminado', key: 'defaultDashboard', type: 'select', options: [{ v: 'overview', l: 'Resumen' }, { v: 'devices', l: 'Dispositivos' }, { v: 'cycles', l: 'Ciclos' }, { v: 'alarms', l: 'Alarmas' }] },
              { label: 'Frecuencia de actualización (ms)', key: 'refreshFrequency', type: 'number' },
              { label: 'Severidad mínima de alerta', key: 'minAlertSeverity', type: 'select', options: [{ v: 'info', l: 'Info' }, { v: 'warning', l: 'Advertencia' }, { v: 'critical', l: 'Solo crítica' }] },
            ].map(field => (
              <div key={field.key}>
                <label className="form-label">{field.label}</label>
                {field.type === 'select' ? (
                  <select className="form-select" style={{ fontSize: '11px' }} value={prefs[field.key]} onChange={e => { handlePrefChange(field.key, e.target.value); if (field.key === 'theme') setThemeMode(e.target.value) }}>
                    {field.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                ) : (
                  <input type="number" className="form-input" style={{ fontSize: '11px' }} value={prefs[field.key]} onChange={e => handlePrefChange(field.key, Number(e.target.value))} step="1000" min="1000" />
                )}
              </div>
            ))}
            {[
              { label: 'Notificaciones push', key: 'pushNotifications' },
              { label: 'Sonidos de alerta', key: 'alertSounds' },
              { label: 'Alertas por correo', key: 'emailAlerts' },
            ].map(toggle => (
              <div key={toggle.key} className="settings-row">
                <span className="form-label">{toggle.label}</span>
                <input type="checkbox" className="toggle-checkbox" checked={prefs[toggle.key]} onChange={e => handlePrefChange(toggle.key, e.target.checked)} />
              </div>
            ))}
            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">URL de Webhook</label>
              <input className="form-input" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }} value={prefs.webhookUrl || ''} onChange={e => handlePrefChange('webhookUrl', e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <button onClick={handleSavePreferences} disabled={saving} className="btn btn-glow" style={{ fontSize: '10px' }}>{saving ? 'GUARDANDO...' : 'GUARDAR PREFERENCIAS'}</button>
          </div>
        </div>
      )}

      {/* Telegram */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <SectionHeader icon="send" title="Telegram" />
        <div style={{ maxWidth: '400px' }}>
          {telegramStatus?.linked ? (
            <div>
              <div className="alert-banner alert-banner-success" style={{ marginBottom: '16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--spore-green)' }}>check_circle</span>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>Vinculado a Telegram</span>
                  <span style={{ fontSize: '11px', color: 'var(--outline)', display: 'block' }}>Chat ID: {telegramStatus.chatId}</span>
                </div>
              </div>
              <button onClick={handleUnlinkTelegram} disabled={telegramLoading} className="btn btn-danger" style={{ fontSize: '10px' }}>{telegramLoading ? 'PROCESANDO...' : 'DESVINCULAR TELEGRAM'}</button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--outline)', marginBottom: '16px' }}>Vincula tu cuenta de Telegram para recibir alertas en tiempo real de tus dispositivos.</p>
              {telegramCode && (
                <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', marginBottom: '16px' }}>
                  <span className="form-label">Envía este código a @Mush2Bot</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--spore-green)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>{telegramCode}</span>
                  <p style={{ fontSize: '11px', color: 'var(--outline)', marginTop: '8px' }}>Envía <code style={{ background: 'var(--surface-container-low)', padding: '2px 4px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>/link {telegramCode}</code> a @Mush2Bot en Telegram</p>
                </div>
              )}
              {telegramMsg && <p style={{ fontSize: '12px', color: telegramMsg.type === 'ok' ? 'var(--spore-green)' : 'var(--error-red)', fontWeight: 600, marginBottom: '12px' }}>{telegramMsg.text}</p>}
              <button onClick={handleLinkTelegram} disabled={telegramLoading} className="btn btn-glow" style={{ fontSize: '10px' }}>{telegramLoading ? 'PROCESANDO...' : telegramCode ? 'ACTUALIZAR CÓDIGO' : 'VINCULAR TELEGRAM'}</button>
            </div>
          )}
        </div>
      </div>

      {/* Password */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <SectionHeader icon="lock" title="Cambiar contraseña" />
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
          <div>
            <label className="form-label">Contraseña actual</label>
            <input type="password" className="form-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Nueva contraseña</label>
            <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Confirmar nueva contraseña</label>
            <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          {pwMsg && <p style={{ fontSize: '12px', color: pwMsg.type === 'ok' ? 'var(--spore-green)' : 'var(--error-red)', fontWeight: 600 }}>{pwMsg.text}</p>}
          <button type="submit" disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword} className="btn btn-glow" style={{ fontSize: '10px', alignSelf: 'flex-start' }}>{pwSaving ? 'CAMBIANDO...' : 'CAMBIAR CONTRASEÑA'}</button>
        </form>
      </div>
    </div>
  )
}

export default UserSettings
