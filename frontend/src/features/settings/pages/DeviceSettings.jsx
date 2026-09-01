import { useState, useEffect } from 'react'
import { getDevices, getDevice, updateDevice } from '../../../api/client.js'
import LoadingState from '../../../shared/components/LoadingState.jsx'
import { getPrimaryStatus } from '../../../shared/constants/deviceStatus.js'

const SELECTED_DEVICE_KEY = 'mush2_settings_selected_device'

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

  async function loadDevices() {
    try {
      const devs = await getDevices()
      setDevices(devs)
      if (devs.length === 0) return
      const saved = localStorage.getItem(SELECTED_DEVICE_KEY)
      const previous = saved && devs.find(d => d.deviceId === saved)
      const next = previous ? previous.deviceId : devs[0].deviceId
      setSelectedId(next)
      if (next !== saved) localStorage.setItem(SELECTED_DEVICE_KEY, next)
      setError(null)
    } catch (err) { setError(err.message || 'Error de conexión') }
    finally { setLoading(false) }
  }

  async function loadDeviceDetail(id) {
    if (!id) return
    setLoadingDetail(true)
    try {
      const dev = await getDevice(id)
      setDevice(dev)
      setRenameValue(dev.chamberName || dev.deviceId || '')
      setError(null)
    } catch (err) { setError(err.message || 'Error de conexión') }
    finally { setLoadingDetail(false) }
  }

  useEffect(() => { loadDevices() }, [])
  useEffect(() => { loadDeviceDetail(selectedId) }, [selectedId])

  async function handleRename() {
    if (!device || !renameValue.trim()) return
    setSaving(true)
    setRenameMsg(null)
    try { await updateDevice(device.deviceId, { chamberName: renameValue.trim() }); setDevice(p => ({ ...p, chamberName: renameValue.trim() })); setRenameMsg({ type: 'ok', text: 'Nombre del dispositivo actualizado' }) }
    catch (err) { setRenameMsg({ type: 'err', text: err.message || 'Falló' }) }
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
          <select value={selectedId || ''} onChange={e => { const value = e.target.value; setSelectedId(value); if (value) localStorage.setItem(SELECTED_DEVICE_KEY, value) }} className="form-select" style={{ fontSize: '11px', minWidth: '180px' }}>
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

          {/* Información */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--spore-green)' }}>settings</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Información</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <InfoRow label="Estado" value={
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
              <InfoRow label="Modo SSR" value={device.ssrActiveLow ? 'Activo bajo' : 'Activo alto'} />
              <InfoRow label="Última conexión" value={device.lastSeen ? new Date(device.lastSeen).toLocaleString() : null} />
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
