import { useState, useEffect } from 'react'
import { getDevices, getDevice, updateDevice, validateThingSpeak } from '../../../api/client.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import { getPrimaryStatus } from '../../../shared/constants/deviceStatus.js'

function DeviceSettings() {
  const [devices, setDevices] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [device, setDevice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameMsg, setRenameMsg] = useState(null)
  const [tsApiKey, setTsApiKey] = useState('')
  const [tsChannels, setTsChannels] = useState([])
  const [tsSelectedChannel, setTsSelectedChannel] = useState(null)
  const [tsChannelId, setTsChannelId] = useState('')
  const [tsReadKey, setTsReadKey] = useState('')
  const [tsWriteKey, setTsWriteKey] = useState('')
  const [tsSyncInterval, setTsSyncInterval] = useState(300000)
  const [tsMsg, setTsMsg] = useState(null)
  const [tsValidating, setTsValidating] = useState(false)

  async function loadDevices() {
    try { const devs = await getDevices(); setDevices(devs); if (!selectedId && devs[0]) setSelectedId(devs[0].id); setError(null) }
    catch (err) { setError(err.message || 'Error de conexión') }
    finally { setLoading(false) }
  }

  async function loadDeviceDetail(id) {
    if (!id) return; setLoadingDetail(true)
    try {
      const dev = await getDevice(id); setDevice(dev)
      setRenameValue(dev.chamberName || dev.deviceId || ''); setTsApiKey(''); setTsChannels([]); setTsSelectedChannel(null)
      setTsChannelId(dev.thingSpeakChannelId || ''); setTsReadKey(dev.thingSpeakReadKey || ''); setTsWriteKey(dev.thingSpeakWriteKey || '')
      setTsSyncInterval(dev.thingSpeakSyncInterval || 300000); setTsMsg(null); setError(null)
    } catch (err) { setError(err.message || 'Error de conexión') }
    finally { setLoadingDetail(false) }
  }

  useEffect(() => { loadDevices() }, [])
  useEffect(() => { loadDeviceDetail(selectedId) }, [selectedId])

  async function handleRename() {
    if (!device || !renameValue.trim()) return; setSaving(true); setRenameMsg(null)
    try { await updateDevice(device.deviceId, { chamberName: renameValue.trim() }); setDevice(p => ({ ...p, chamberName: renameValue.trim() })); setRenameMsg({ type: 'ok', text: 'Nombre del dispositivo actualizado' }) }
    catch (err) { setRenameMsg({ type: 'err', text: err.message || 'Falló' }) }
    finally { setSaving(false) }
  }

  async function handleValidateThingSpeak() {
    if (!device || !tsApiKey.trim()) return; setTsValidating(true); setTsMsg(null); setTsChannels([]); setTsSelectedChannel(null)
    try { const r = await validateThingSpeak(device.deviceId, tsApiKey.trim()); if (r.valid) { setTsChannels(r.channels); setTsMsg({ type: 'ok', text: `Clave válida — ${r.channels.length} canal(es) encontrado(s)` }) } }
    catch (err) { setTsMsg({ type: 'err', text: err.response?.data?.error || 'Clave de API inválida' }) }
    finally { setTsValidating(false) }
  }

  function handleSelectChannel(ch) { setTsSelectedChannel(ch); setTsChannelId(String(ch.id)); setTsReadKey(ch.readKey || ''); setTsWriteKey(ch.writeKey || '') }

  async function handleSaveThingSpeak() {
    if (!device) return; setSaving(true); setTsMsg(null)
    try {
      const enabled = !!tsChannelId
      const payload = { thingSpeakEnabled: enabled, thingSpeakChannelId: enabled ? tsChannelId : null, thingSpeakReadKey: enabled ? tsReadKey : null, thingSpeakWriteKey: enabled ? tsWriteKey : null, thingSpeakSyncInterval: parseInt(tsSyncInterval, 10) || 300000 }
      await updateDevice(device.deviceId, payload); setDevice(p => ({ ...p, ...payload })); setTsMsg({ type: 'ok', text: enabled ? 'ThingSpeak habilitado y guardado' : 'ThingSpeak deshabilitado' })
    } catch (err) { setTsMsg({ type: 'err', text: err.message || 'Falló' }) }
    finally { setSaving(false) }
  }

  async function handleDisconnectThingSpeak() {
    if (!device) return; setSaving(true); setTsMsg(null)
    try {
      await updateDevice(device.deviceId, { thingSpeakEnabled: false, thingSpeakChannelId: null, thingSpeakReadKey: null, thingSpeakWriteKey: null })
      setDevice(p => ({ ...p, thingSpeakEnabled: false, thingSpeakChannelId: null, thingSpeakReadKey: null, thingSpeakWriteKey: null }))
      setTsApiKey(''); setTsChannels([]); setTsSelectedChannel(null); setTsChannelId(''); setTsReadKey(''); setTsWriteKey('')
      setTsMsg({ type: 'ok', text: 'ThingSpeak desconectado' })
    } catch (err) { setTsMsg({ type: 'err', text: err.message || 'Falló' }) }
    finally { setSaving(false) }
  }

  if (loading) return <LoadingState message="Cargando configuración del dispositivo..." icon="developer_board" />

  const InfoRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--on-surface)' }}>{value || '—'}</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="gradient-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Configuración del dispositivo</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--outline)' }}>Identidad y parámetros de hardware</p>
        </div>
        {devices.length > 0 && (
          <select value={selectedId || ''} onChange={e => setSelectedId(e.target.value)} className="form-select" style={{ fontSize: '11px', minWidth: '180px' }}>
            {devices.map(d => <option key={d.id} value={d.deviceId}>{d.chamberName || d.deviceId}</option>)}
          </select>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {loadingDetail ? (
        <LoadingState message="Cargando detalles del dispositivo..." />
      ) : device ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Identity */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--spore-green)' }}>badge</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Identidad</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <InfoRow label="Device ID" value={device.deviceId} />
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Nombre de cámara</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="form-input" style={{ flex: 1, fontSize: '11px' }} value={renameValue} onChange={e => setRenameValue(e.target.value)} placeholder="Ingresar nombre..." />
                  <button onClick={handleRename} disabled={saving || !renameValue.trim()} className="btn btn-glow" style={{ fontSize: '10px', padding: '6px 12px' }}>{saving ? '...' : 'GUARDAR'}</button>
                </div>
                {renameMsg && <p style={{ fontSize: '10px', marginTop: '4px', color: renameMsg.type === 'ok' ? 'var(--spore-green)' : 'var(--error-red)' }}>{renameMsg.text}</p>}
              </div>
            </div>
          </div>

          {/* Hardware */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--spore-green)' }}>settings</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Hardware</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <InfoRow label="Status" value={
                (() => {
                  const primary = getPrimaryStatus(device.status)
                  return (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: primary.config.color }} />
                      {primary.config.label}
                    </span>
                  )
                })()
              } />
              <InfoRow label="MAC Address" value={device.macAddress} />
              <InfoRow label="Firmware" value={device.firmwareVersion} />
              <InfoRow label="HW Revision" value={device.hwRevision} />
              <InfoRow label="ID de cámara" value={device.chamberId != null ? device.chamberId : null} />
              <InfoRow label="Ubicación" value={device.chamberLocation} />
              <InfoRow label="Modo SSR" value={device.ssrActiveLow ? 'Activo bajo' : 'Activo alto'} />
              <InfoRow label="Última conexión" value={device.lastSeen ? new Date(device.lastSeen).toLocaleString() : null} />
            </div>
          </div>

          {/* ThingSpeak */}
          <div className="glass-card" style={{ padding: '20px', gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--accent-blue, #60a5fa)' }}>cloud_sync</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>ThingSpeak</span>
              <span style={{
                padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                background: device.thingSpeakEnabled ? 'rgba(var(--spore-green-rgb), 0.15)' : 'rgba(153, 153, 153, 0.1)',
                color: device.thingSpeakEnabled ? 'var(--spore-green)' : 'var(--outline)',
                border: `1px solid ${device.thingSpeakEnabled ? 'rgba(var(--spore-green-rgb), 0.3)' : 'rgba(153, 153, 153, 0.3)'}`,
              }}>
                {device.thingSpeakEnabled ? 'HABILITADO' : 'DESHABILITADO'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>API Key</label>
                   <input type="password" className="form-input" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }} value={tsApiKey} onChange={e => setTsApiKey(e.target.value)} placeholder={device.thingSpeakChannelId ? '••••••••••••••••' : 'Ingresa tu clave de API de TS'} />
                </div>
                <button onClick={handleValidateThingSpeak} disabled={tsValidating || !tsApiKey.trim()} className="btn btn-secondary" style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>{tsValidating ? '...' : 'VALIDAR'}</button>
              </div>

              {tsChannels.length > 0 && (
                <div>
                   <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Seleccionar canal</label>
                   <select className="form-select" style={{ fontSize: '11px' }} value={tsSelectedChannel?.id || tsChannelId || ''} onChange={e => { const ch = tsChannels.find(c => String(c.id) === e.target.value); if (ch) handleSelectChannel(ch) }}>
                     <option value="">Seleccionar un canal...</option>
                    {tsChannels.map(ch => <option key={ch.id} value={ch.id}>{ch.name || ch.id}</option>)}
                  </select>
                </div>
              )}

              {tsChannelId && (
                <>
                  <InfoRow label="Channel ID" value={tsChannelId} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                       <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Clave de lectura</label>
                       <input className="form-input" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }} value={tsReadKey} onChange={e => setTsReadKey(e.target.value)} placeholder="Clave de API de lectura" />
                     </div>
                     <div>
                       <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Clave de escritura</label>
                       <input className="form-input" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }} value={tsWriteKey} onChange={e => setTsWriteKey(e.target.value)} placeholder="Clave de API de escritura" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                       <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Intervalo de sincronización (ms)</label>
                      <input type="number" className="form-input" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }} min="60000" step="60000" value={tsSyncInterval} onChange={e => setTsSyncInterval(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--outline-variant)' }}>
                     <button onClick={handleDisconnectThingSpeak} disabled={saving} className="btn btn-danger" style={{ fontSize: '10px' }}>DESCONECTAR</button>
                     <button onClick={handleSaveThingSpeak} disabled={saving || !tsChannelId.trim()} className="btn btn-glow" style={{ fontSize: '10px' }}>{saving ? '...' : 'GUARDAR'}</button>
                  </div>
                </>
              )}

              {tsMsg && <p style={{ fontSize: '11px', fontWeight: 600, color: tsMsg.type === 'ok' ? 'var(--spore-green)' : 'var(--error-red)' }}>{tsMsg.text}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)', marginBottom: '16px', display: 'block' }}>developer_board</span>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '8px' }}>Sin dispositivos</h3>
          <p style={{ fontSize: '13px', color: 'var(--outline)' }}>Conecta un dispositivo para configurar los ajustes de hardware.</p>
        </div>
      )}
    </div>
  )
}

export default DeviceSettings
