import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDevice } from '../../../api/client.js'

const PROV_SERVICE_UUID = 'a7c3d6e0-f1b2-4a5b-8c9d-0e1f2a3b4c5d'
const PROV_CHAR_DEVICE_INFO = 'a7c3d6e1-f1b2-4a5b-8c9d-0e1f2a3b4c5d'
const PROV_CHAR_WIFI_SSID = 'a7c3d6e2-f1b2-4a5b-8c9d-0e1f2a3b4c5d'
const PROV_CHAR_WIFI_PASS = 'a7c3d6e3-f1b2-4a5b-8c9d-0e1f2a3b4c5d'
const PROV_CHAR_CMD = 'a7c3d6e4-f1b2-4a5b-8c9d-0e1f2a3b4c5d'
const PROV_CHAR_STATUS = 'a7c3d6e5-f1b2-4a5b-8c9d-0e1f2a3b4c5d'

const STEPS = { SCAN: 0, CONFIG: 1, PROVISIONING: 2, DONE: 3, ERROR: -1 }
const STEP_LABELS = ['ESCANEO', 'CONFIGURACIÓN', 'ENVIAR', 'LISTO']

function Provisioning() {
  const navigate = useNavigate()
  const [step, setStep] = useState(STEPS.SCAN)
  const [error, setError] = useState(null)
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [ssid, setSsid] = useState('')
  const [password, setPassword] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [bleNotSupported, setBleNotSupported] = useState(false)
  const serverRef = useRef(null)
  const serviceRef = useRef(null)
  const statusCharRef = useRef(null)

  const isWebBluetoothSupported = useCallback(() => navigator.bluetooth !== undefined, [])

  const handleScan = useCallback(async () => {
    setError(null); setDevices([])
    if (!isWebBluetoothSupported()) { setBleNotSupported(true); setError('Web Bluetooth no soportado. Usa Chrome o Edge 90+.'); return }
    try {
      const device = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'Mush2' }], optionalServices: [PROV_SERVICE_UUID] })
      setDevices([device]); setSelectedDevice(device); setStep(STEPS.CONFIG)
      const server = await device.gatt.connect(); serverRef.current = server
      const service = await server.getPrimaryService(PROV_SERVICE_UUID); serviceRef.current = service
      const infoChar = await service.getCharacteristic(PROV_CHAR_DEVICE_INFO)
      const infoValue = await infoChar.readValue(); const infoStr = new TextDecoder().decode(infoValue)
      try { setDeviceInfo(JSON.parse(infoStr)) } catch { setDeviceInfo({ raw: infoStr }) }
      statusCharRef.current = await service.getCharacteristic(PROV_CHAR_STATUS)
      await statusCharRef.current.startNotifications()
      statusCharRef.current.addEventListener('characteristicvaluechanged', (event) => {
        const val = new TextDecoder().decode(event.target.value)
        try {
          const status = JSON.parse(val); setStatusMsg(`${status.status}: ${status.msg}`)
          if (status.status === 'ok' && status.msg.includes('Credenciales guardadas')) setStep(STEPS.DONE)
          else if (status.status === 'error') { setStep(STEPS.ERROR); setError(status.msg) }
        } catch { setStatusMsg(val) }
      })
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (err) {
      if (err.name === 'NotFoundError') setError('No se encontró ningún dispositivo Mush2. Asegúrate de que esté en modo aprovisionamiento.')
      else setError(err.message || 'Error al conectar')
      setStep(STEPS.ERROR)
    }
  }, [isWebBluetoothSupported])

  const handleProvision = useCallback(async () => {
    if (!ssid.trim()) { setError('El nombre de la red Wi-Fi es requerido'); return }
    setError(null); setStep(STEPS.PROVISIONING); setStatusMsg('Enviando credenciales...')
    try {
      const service = serviceRef.current
      const ssidChar = await service.getCharacteristic(PROV_CHAR_WIFI_SSID)
      const passChar = await service.getCharacteristic(PROV_CHAR_WIFI_PASS)
      const cmdChar = await service.getCharacteristic(PROV_CHAR_CMD)
      const encoder = new TextEncoder()
      await ssidChar.writeValue(encoder.encode(ssid)); await passChar.writeValue(encoder.encode(password))
      await cmdChar.writeValue(encoder.encode('provision'))
      setStatusMsg('Credenciales enviadas. El dispositivo se reiniciará...')
    } catch (err) { setStep(STEPS.ERROR); setError(err.message || 'Error al enviar credenciales') }
  }, [ssid, password])

  const handleFactoryReset = useCallback(async () => {
    if (!confirm('¿Restablecer el dispositivo? Se borrarán todas las credenciales.')) return
    try {
      const cmdChar = await serviceRef.current.getCharacteristic(PROV_CHAR_CMD)
      await cmdChar.writeValue(new TextEncoder().encode('factory_reset'))
      setStatusMsg('Restablecimiento de fábrica ejecutado. El dispositivo se reiniciará en modo aprovisionamiento.')
    } catch (err) { setError(err.message || 'Error al ejecutar restablecimiento de fábrica') }
  }, [])

  const handleDisconnect = useCallback(async () => {
    if (serverRef.current) { try { serverRef.current.disconnect() } catch {} serverRef.current = null; serviceRef.current = null; statusCharRef.current = null }
    setStep(STEPS.SCAN); setSelectedDevice(null); setDeviceInfo(null); setStatusMsg(''); setError(null)
  }, [])

  useEffect(() => {
    if (step === STEPS.DONE && deviceInfo?.deviceId) {
      createDevice({ deviceId: deviceInfo.deviceId, macAddress: deviceInfo.deviceId, chamberName: `Mush2-${deviceInfo.deviceId.slice(-4)}` }).catch(() => {})
    }
  }, [step, deviceInfo])

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 className="gradient-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Aprovisionamiento</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--outline)' }}>
          Configura dispositivos Mush2 nuevos mediante Bluetooth
        </p>
      </div>

      {/* Step Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
        {[0, 1, 2, 3].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, transition: 'all 0.3s',
              background: step >= s ? 'var(--spore-green)' : 'var(--surface-container-high)',
              color: step >= s ? 'var(--bg-primary)' : 'var(--on-surface-variant)',
              boxShadow: step >= s ? '0 0 12px rgba(var(--spore-green-rgb), 0.3)' : 'none',
            }}>
              {step > s ? '✓' : i + 1}
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em',
              color: step >= s ? 'var(--on-surface)' : 'var(--on-surface-variant)', fontWeight: step >= s ? 700 : 400,
            }}>{STEP_LABELS[i]}</span>
            {i < 3 && <div style={{ width: '32px', height: '1px', background: step > s ? 'var(--spore-green)' : 'var(--outline-variant)' }} />}
          </div>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
          <span style={{ fontSize: '12px', color: 'var(--error-red)', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* SCAN */}
      {step === STEPS.SCAN && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '64px', color: 'var(--spore-green)', marginBottom: '16px', display: 'block' }}>bluetooth_searching</span>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '8px' }}>Aprovisionamiento de dispositivo BLE</h2>
            <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
              Escanea dispositivos Mush2 cercanos para configurar su conexión Wi-Fi.
              Asegúrate de que el dispositivo esté encendido y en modo aprovisionamiento.
            </p>
          </div>

          {bleNotSupported && (
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '24px', maxWidth: '400px' }}>
              <p style={{ fontSize: '12px', color: 'var(--error-red)' }}>Web Bluetooth requiere Chrome 90+, Edge 90+, o navegadores basados en Chromium.</p>
            </div>
          )}

          <button onClick={handleScan} className="btn btn-glow" style={{ fontSize: '12px', padding: '12px 32px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
            Escanear dispositivos
          </button>
        </div>
      )}

      {/* CONFIG */}
      {step === STEPS.CONFIG && (
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <button onClick={handleDisconnect} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--on-surface-variant)', fontSize: '12px', marginBottom: '24px', padding: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
            Volver al escaneo
          </button>

          {/* Device Info */}
          {deviceInfo && (
            <div className="glass-card" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--spore-green)' }}>developer_board</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Dispositivo Detectado</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'ID Dispositivo', value: deviceInfo.deviceId || selectedDevice.name },
                  { label: 'Firmware', value: deviceInfo.fwVer || '—' },
                  { label: 'Rev. Hardware', value: deviceInfo.hwRev || '—' },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '10px', borderRadius: '8px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>{item.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--on-surface)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wi-Fi Config */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--spore-green)' }}>wifi</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Configuración Wi-Fi</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>SSID (Nombre de Red)</label>
                <input className="form-input" value={ssid} onChange={e => setSsid(e.target.value)} placeholder="MiRedWiFi" />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Contraseña</label>
                <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleProvision} className="btn btn-glow" style={{ flex: 1, fontSize: '12px', padding: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings_ethernet</span>
              Aprovisionar dispositivo
            </button>
            <button onClick={handleFactoryReset} className="btn btn-secondary" style={{ padding: '12px 16px' }} title="Restablecimiento de fábrica">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>restart_alt</span>
            </button>
          </div>
        </div>
      )}

      {/* PROVISIONING */}
      {step === STEPS.PROVISIONING && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', border: '3px solid var(--spore-green)', borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite', marginBottom: '24px',
          }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '8px' }}>Aprovisionando...</h2>
          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>{statusMsg || 'Enviando configuración al dispositivo'}</p>
        </div>
      )}

      {/* DONE */}
      {step === STEPS.DONE && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(var(--spore-green-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--spore-green)' }}>check_circle</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '8px' }}>Dispositivo configurado</h2>
          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', maxWidth: '400px', textAlign: 'center', marginBottom: '24px', lineHeight: 1.6 }}>
            Las credenciales Wi-Fi han sido enviadas al dispositivo.
            Se reiniciará automáticamente y debería aparecer en su panel de control en breve.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => navigate('/overview')} className="btn btn-glow" style={{ fontSize: '12px', padding: '12px 24px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>dashboard</span>
              Ir al panel de control
            </button>
            <button onClick={handleDisconnect} className="btn btn-secondary" style={{ fontSize: '12px', padding: '12px 24px' }}>Configurar otro dispositivo</button>
          </div>
        </div>
      )}

      {/* ERROR */}
      {step === STEPS.ERROR && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--error-red)' }}>error</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '8px' }}>Error en aprovisionamiento</h2>
          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', maxWidth: '400px', textAlign: 'center', marginBottom: '8px' }}>{error}</p>
          {statusMsg && <p style={{ fontSize: '11px', color: 'var(--outline)', maxWidth: '400px', textAlign: 'center', marginBottom: '24px' }}>{statusMsg}</p>}
          <button onClick={handleDisconnect} className="btn btn-glow" style={{ fontSize: '12px', padding: '12px 24px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Reintentar
          </button>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default Provisioning
