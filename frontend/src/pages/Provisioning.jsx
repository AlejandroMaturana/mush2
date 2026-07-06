import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const PROV_SERVICE_UUID = 'a7c3d6e0-f1b2-4a5b-8c9d-0e1f2a3b4c5d'
const PROV_CHAR_DEVICE_INFO = 'a7c3d6e1-f1b2-4a5b-8c9d-0e1f2a3b4c5d'
const PROV_CHAR_WIFI_SSID = 'a7c3d6e2-f1b2-4a5b-8c9d-0e1f2a3b4c5d'
const PROV_CHAR_WIFI_PASS = 'a7c3d6e3-f1b2-4a5b-8c9d-0e1f2a3b4c5d'
const PROV_CHAR_CMD = 'a7c3d6e4-f1b2-4a5b-8c9d-0e1f2a3b4c5d'
const PROV_CHAR_STATUS = 'a7c3d6e5-f1b2-4a5b-8c9d-0e1f2a3b4c5d'

const STEPS = { SCAN: 0, CONFIG: 1, PROVISIONING: 2, DONE: 3, ERROR: -1 }

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

  const isWebBluetoothSupported = useCallback(() => {
    return navigator.bluetooth !== undefined
  }, [])

  const handleScan = useCallback(async () => {
    setError(null)
    setDevices([])

    if (!isWebBluetoothSupported()) {
      setBleNotSupported(true)
      setError('Web Bluetooth no está soportado en este navegador. Usa Chrome o Edge versión 90+.')
      return
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'Mush2' }],
        optionalServices: [PROV_SERVICE_UUID],
      })

      setDevices([device])
      setSelectedDevice(device)
      setStep(STEPS.CONFIG)

      const server = await device.gatt.connect()
      serverRef.current = server

      const service = await server.getPrimaryService(PROV_SERVICE_UUID)
      serviceRef.current = service

      const infoChar = await service.getCharacteristic(PROV_CHAR_DEVICE_INFO)
      const infoValue = await infoChar.readValue()
      const infoStr = new TextDecoder().decode(infoValue)
      try {
        setDeviceInfo(JSON.parse(infoStr))
      } catch {
        setDeviceInfo({ raw: infoStr })
      }

      statusCharRef.current = await service.getCharacteristic(PROV_CHAR_STATUS)
      await statusCharRef.current.startNotifications()
      statusCharRef.current.addEventListener('characteristicvaluechanged', (event) => {
        const val = new TextDecoder().decode(event.target.value)
        try {
          const status = JSON.parse(val)
          setStatusMsg(`${status.status}: ${status.msg}`)
          if (status.status === 'ok' && status.msg.includes('Credenciales guardadas')) {
            setStep(STEPS.DONE)
          } else if (status.status === 'error') {
            setStep(STEPS.ERROR)
            setError(status.msg)
          }
        } catch {
          setStatusMsg(val)
        }
      })

      await new Promise(resolve => setTimeout(resolve, 500))

    } catch (err) {
      if (err.name === 'NotFoundError') {
        setError('No se encontró ningún dispositivo Mush2. Asegúrate de que el dispositivo esté en modo provisioning.')
      } else {
        setError(err.message || 'Error al conectar con el dispositivo')
      }
      setStep(STEPS.ERROR)
    }
  }, [isWebBluetoothSupported])

  const handleProvision = useCallback(async () => {
    if (!ssid.trim()) {
      setError('El nombre de la red Wi-Fi es requerido')
      return
    }

    setError(null)
    setStep(STEPS.PROVISIONING)
    setStatusMsg('Enviando credenciales...')

    try {
      const service = serviceRef.current

      const ssidChar = await service.getCharacteristic(PROV_CHAR_WIFI_SSID)
      const passChar = await service.getCharacteristic(PROV_CHAR_WIFI_PASS)
      const cmdChar = await service.getCharacteristic(PROV_CHAR_CMD)

      const encoder = new TextEncoder()
      await ssidChar.writeValue(encoder.encode(ssid))
      await passChar.writeValue(encoder.encode(password))
      await cmdChar.writeValue(encoder.encode('provision'))

      setStatusMsg('Credenciales enviadas. El dispositivo se reiniciará...')

    } catch (err) {
      setStep(STEPS.ERROR)
      setError(err.message || 'Error al enviar credenciales')
    }
  }, [ssid, password])

  const handleFactoryReset = useCallback(async () => {
    if (!confirm('¿Estás seguro de resetear el dispositivo? Se borrarán todas las credenciales.')) return

    try {
      const cmdChar = await serviceRef.current.getCharacteristic(PROV_CHAR_CMD)
      const encoder = new TextEncoder()
      await cmdChar.writeValue(encoder.encode('factory_reset'))
      setStatusMsg('Factory reset ejecutado. El dispositivo se reiniciará en modo provisioning.')
    } catch (err) {
      setError(err.message || 'Error al ejecutar factory reset')
    }
  }, [])

  const handleDisconnect = useCallback(async () => {
    if (serverRef.current) {
      try { serverRef.current.disconnect() } catch {}
      serverRef.current = null
      serviceRef.current = null
      statusCharRef.current = null
    }
    setStep(STEPS.SCAN)
    setSelectedDevice(null)
    setDeviceInfo(null)
    setStatusMsg('')
    setError(null)
  }, [])

  const renderScan = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-8 text-center">
        <span className="material-symbols-outlined text-6xl text-primary mb-4">bluetooth_searching</span>
        <h2 className="text-headline-lg text-on-surface mb-2">BLE Device Provisioning</h2>
        <p className="text-on-surface-variant text-body-md max-w-lg">
          Escanea dispositivos Mush2 cercanos para configurar su conexión Wi-Fi.
          Asegúrate de que el dispositivo esté encendido y en modo provisioning.
        </p>
      </div>

      {bleNotSupported && (
        <div className="glass-card p-4 rounded-xl border border-error/40 bg-error-container/5 mb-6 max-w-md">
          <p className="text-error text-body-sm">
            Web Bluetooth requiere Chrome 90+, Edge 90+, o navegadores basados en Chromium.
          </p>
        </div>
      )}

      <button onClick={handleScan} className="btn-primary px-8 py-3 rounded-xl text-body-lg font-medium">
        <span className="material-symbols-outlined mr-2">search</span>
        Escanear dispositivos
      </button>
    </div>
  )

  const renderConfig = () => (
    <div className="max-w-lg mx-auto py-8">
      <button onClick={handleDisconnect} className="text-on-surface-variant text-body-sm mb-6 flex items-center gap-1 hover:text-on-surface">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Volver al escaneo
      </button>

      {deviceInfo && (
        <div className="glass-card p-4 rounded-xl border border-outline-variant mb-6">
          <h3 className="font-label-caps text-label-caps text-secondary mb-3">DISPOSITIVO DETECTADO</h3>
          <div className="grid grid-cols-2 gap-3 text-body-sm">
            <div>
              <span className="text-on-surface-variant">Device ID</span>
              <p className="text-on-surface font-mono">{deviceInfo.deviceId || selectedDevice.name}</p>
            </div>
            <div>
              <span className="text-on-surface-variant">Firmware</span>
              <p className="text-on-surface font-mono">{deviceInfo.fwVer || '-'}</p>
            </div>
            <div>
              <span className="text-on-surface-variant">HW Rev</span>
              <p className="text-on-surface font-mono">{deviceInfo.hwRev || '-'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card p-5 rounded-xl border border-outline-variant mb-6">
        <h3 className="font-label-caps text-label-caps text-secondary mb-4">CONFIGURACIÓN Wi-Fi</h3>
        <div className="space-y-4">
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">SSID (NOMBRE DE RED)</label>
            <input className="form-input" value={ssid} onChange={e => setSsid(e.target.value)} placeholder="MiRedWiFi" />
          </div>
          <div>
            <label className="font-label-caps text-9px text-on-surface-variant block mb-1">CONTRASEÑA</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleProvision} className="btn-primary flex-1 py-3 rounded-xl text-body-md font-medium">
          <span className="material-symbols-outlined mr-2">settings_ethernet</span>
          Provisionar dispositivo
        </button>
        <button onClick={handleFactoryReset} className="glass-card px-4 py-3 rounded-xl border border-outline-variant text-on-surface-variant hover:text-error">
          <span className="material-symbols-outlined">restart_alt</span>
        </button>
      </div>
    </div>
  )

  const renderProvisioning = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-6">
        <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      <h2 className="text-headline-lg text-on-surface mb-2">Provisionando...</h2>
      <p className="text-on-surface-variant text-body-md">{statusMsg || 'Enviando configuración al dispositivo'}</p>
    </div>
  )

  const renderDone = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-4xl text-primary">check_circle</span>
      </div>
      <h2 className="text-headline-lg text-on-surface mb-2">Dispositivo configurado</h2>
      <p className="text-on-surface-variant text-body-md max-w-md text-center mb-6">
        Las credenciales Wi-Fi han sido enviadas al dispositivo.
        Se reiniciará automáticamente y debería aparecer en tu dashboard en breve.
      </p>
      <div className="flex gap-3">
        <button onClick={() => navigate('/devices')} className="btn-primary px-6 py-3 rounded-xl text-body-md font-medium">
          <span className="material-symbols-outlined mr-2">dashboard</span>
          Ir al Dashboard
        </button>
        <button onClick={handleDisconnect} className="glass-card px-6 py-3 rounded-xl border border-outline-variant text-on-surface">
          Configurar otro dispositivo
        </button>
      </div>
    </div>
  )

  const renderError = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-4xl text-error">error</span>
      </div>
      <h2 className="text-headline-lg text-on-surface mb-2">Error en provisioning</h2>
      <p className="text-on-surface-variant text-body-md max-w-md text-center mb-2">{error}</p>
      <p className="text-on-surface-variant text-body-sm max-w-md text-center mb-6">{statusMsg}</p>
      <button onClick={handleDisconnect} className="btn-primary px-6 py-3 rounded-xl text-body-md font-medium">
        <span className="material-symbols-outlined mr-2">refresh</span>
        Reintentar
      </button>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface mb-1">Provisioning</h1>
        <p className="text-on-surface-variant text-body-md">
          Configura dispositivos Mush2 nuevos mediante Bluetooth.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {[0, 1, 2, 3].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-body-sm font-medium ${
              step >= s ? 'bg-primary text-black' : 'bg-surface-container-highest text-on-surface-variant'
            }`}>
              {step > s ? '✓' : i + 1}
            </div>
            <span className={`text-label-caps text-9px ${step >= s ? 'text-on-surface' : 'text-on-surface-variant'}`}>
              {['ESCANEAR', 'CONFIGURAR', 'ENVIAR', 'LISTO'][i]}
            </span>
            {i < 3 && <div className={`w-8 h-px ${step > s ? 'bg-primary' : 'bg-outline-variant'}`} />}
          </div>
        ))}
      </div>

      {step === STEPS.SCAN && renderScan()}
      {step === STEPS.CONFIG && renderConfig()}
      {step === STEPS.PROVISIONING && renderProvisioning()}
      {step === STEPS.DONE && renderDone()}
      {step === STEPS.ERROR && renderError()}
    </div>
  )
}

export default Provisioning
