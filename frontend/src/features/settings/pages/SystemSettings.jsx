import { useState, useEffect } from 'react'
import { getSystemSettings, updateSystemSettings, configureTelegramBot, getTelegramBotStatus } from '../../../api/client.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'

const SAFETY_KEYS = ['temp_critical', 'temp_recovery']

const SAFETY_CONFIG = {
  temp_critical: { label: 'Temperatura crítica (°C)', description: 'Umbral de temperatura que dispara el estado de fallo crítico (control engine).' },
  temp_recovery: { label: 'Temperatura de recuperación (°C)', description: 'Temperatura a la que el dispositivo retoma la operación normal tras un fallo crítico.' },
}

function SystemSettings() {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [tgToken, setTgToken] = useState('')
  const [tgUsername, setTgUsername] = useState('')
  const [tgStatus, setTgStatus] = useState(null)
  const [tgSaving, setTgSaving] = useState(false)
  const [tgMsg, setTgMsg] = useState(null)

  async function fetchSettings() {
    try { const data = await getSystemSettings(); setSettings(data); setError(null) }
    catch (err) { setError(err.message || 'Error al cargar') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchSettings() }, [])

  async function loadTgStatus() { try { const st = await getTelegramBotStatus(); setTgStatus(st) } catch {} }

  useEffect(() => {
    if (!loading) {
      loadTgStatus()
      const tgTok = settings.find(s => s.key === 'telegram_bot_token')
      const tgUser = settings.find(s => s.key === 'telegram_bot_username')
      if (tgTok) setTgToken(tgTok.value); if (tgUser) setTgUsername(tgUser.value)
    }
  }, [loading, settings])

  async function handleConfigureTelegram(e) {
    e.preventDefault(); if (!tgToken) return; setTgSaving(true); setTgMsg(null)
    try {
      const result = await configureTelegramBot({ token: tgToken, username: tgUsername })
      setTgStatus({ running: result.running, username: result.username, tokenConfigured: true, configuredUsername: tgUsername, lastError: result.lastError })
      setTgMsg({ type: result.running ? 'ok' : 'err', text: result.running ? 'Bot inicializado correctamente' : `Bot falló: ${result.lastError || 'error desconocido'}` })
    } catch (err) { setTgMsg({ type: 'err', text: err.response?.data?.error || err.message }) }
    finally { setTgSaving(false) }
  }

  function handleChange(key, value) { setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s)) }

  async function handleSave() {
    const safetySettings = settings.filter(s => SAFETY_KEYS.includes(s.key))
    setSaving(true); setMsg(null)
    try { await updateSystemSettings(safetySettings.map(s => ({ key: s.key, value: s.value }))); setMsg({ type: 'ok', text: 'Configuración del sistema guardada' }) }
    catch (err) { setMsg({ type: 'err', text: err.response?.data?.error || err.message || 'Falló' }) }
    finally { setSaving(false) }
  }

  if (loading) return <LoadingState message="Cargando configuración del sistema..." icon="settings" />

  const safetySettings = settings.filter(s => SAFETY_KEYS.includes(s.key))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="gradient-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Configuración del sistema</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--outline)' }}>Parámetros de configuración global (solo SUPER_ADMIN)</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-glow" style={{ fontSize: '10px' }} onClick={handleSave} disabled={saving}>{saving ? 'GUARDANDO...' : 'GUARDAR'}</button>
        </div>
      </div>

      {msg && (
        <div className={`alert-banner ${msg.type === 'ok' ? 'alert-banner-success' : 'alert-banner-error'}`}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: msg.type === 'ok' ? 'var(--spore-green)' : 'var(--error-red)' }}>{msg.text}</span>
        </div>
      )}

      {settings.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)', marginBottom: '16px', display: 'block' }}>settings</span>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '8px' }}>Sin configuración</h3>
          <p style={{ fontSize: '13px', color: 'var(--outline)', marginBottom: '16px' }}>No se pudieron cargar los parámetros de seguridad.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Seguridad */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--spore-green)' }}>shield</span>
              <span className="section-label">Seguridad</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {safetySettings.map(s => (
                <div key={s.key} className="settings-row">
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <span className="form-label">{SAFETY_CONFIG[s.key]?.label || s.label || s.key}</span>
                    {SAFETY_CONFIG[s.key]?.description && <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)', display: 'block', marginTop: '2px' }}>{SAFETY_CONFIG[s.key].description}</span>}
                    <span style={{ fontSize: '9px', color: 'var(--outline)', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '2px' }}>{s.key}</span>
                  </div>
                  <div style={{ width: '180px', flexShrink: 0 }}>
                    <input type="number" className="form-input" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }} value={s.value} onChange={e => handleChange(s.key, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Telegram Bot */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--accent-blue, #60a5fa)' }}>send</span>
          <span className="section-label">Telegram Bot</span>
        </div>

        {tgStatus && (
          <div className={`alert-banner ${tgStatus.running ? 'alert-banner-success' : 'alert-banner-error'}`} style={{ marginBottom: '16px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tgStatus.running ? 'var(--spore-green)' : 'var(--error-red)', boxShadow: tgStatus.running ? '0 0 8px var(--spore-green)' : 'none' }} />
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>{tgStatus.running ? 'Bot en ejecución' : 'Bot detenido'}</span>
              {tgStatus.username && <span style={{ fontSize: '11px', color: 'var(--outline)', display: 'block' }}>@{tgStatus.username}</span>}
              {tgStatus.lastError && <span style={{ fontSize: '11px', color: 'var(--error-red)', display: 'block' }}>Error: {tgStatus.lastError}</span>}
            </div>
          </div>
        )}

        <form onSubmit={handleConfigureTelegram} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
          <div>
            <label className="form-label">Bot Token</label>
            <input type="password" className="form-input" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }} value={tgToken} onChange={e => setTgToken(e.target.value)} placeholder="123456:ABC-DEF..." autoComplete="off" />
          </div>
          <div>
            <label className="form-label">Bot Username</label>
            <input className="form-input" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }} value={tgUsername} onChange={e => setTgUsername(e.target.value)} placeholder="MyMush2Bot" />
          </div>
          {tgMsg && <p style={{ fontSize: '12px', fontWeight: 600, color: tgMsg.type === 'ok' ? 'var(--spore-green)' : 'var(--error-red)' }}>{tgMsg.text}</p>}
          <button type="submit" disabled={tgSaving || !tgToken} className="btn btn-glow" style={{ fontSize: '10px', alignSelf: 'flex-start' }}>{tgSaving ? 'INITIALIZING...' : 'SAVE & INITIALIZE BOT'}</button>
        </form>

        <details style={{ marginTop: '16px' }}>
          <summary className="form-label" style={{ cursor: 'pointer' }}>How to create a Telegram bot?</summary>
          <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
            <p>1. Open Telegram and search for <strong>@BotFather</strong></p>
            <p>2. Send <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--surface-container-low)', padding: '2px 4px', borderRadius: '4px' }}>/newbot</code></p>
            <p>3. Choose a display name (e.g. <em>My Mush2 Bot</em>)</p>
            <p>4. Choose a username ending in <em>Bot</em></p>
            <p>5. Copy the <strong>HTTP API token</strong></p>
            <p>6. Paste it in the <strong>Bot Token</strong> field above and save</p>
          </div>
        </details>
      </div>
    </div>
  )
}

export default SystemSettings
