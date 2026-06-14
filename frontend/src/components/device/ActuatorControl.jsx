import { useState } from 'react'
import { setActuator } from '../../api/client.js'

const CHANNEL_LABELS = { 1: 'Calefacción', 2: 'Ventilación', 3: 'Humedad' }

function ActuatorControl({ deviceId, actuator, onCommandSent }) {
  const [sending, setSending] = useState(false)
  const [cmdError, setCmdError] = useState(null)

  async function handleToggle() {
    const newState = actuator.state === 'ON' ? 'OFF' : 'ON'
    setSending(true)
    setCmdError(null)
    try {
      await setActuator(deviceId, actuator.channel, newState)
      if (onCommandSent) onCommandSent(actuator.channel, newState)
    } catch (err) {
      console.error('Error sending command:', err)
      const status = err.response?.status
      const serverMsg = err.response?.data?.message || err.response?.data?.error
      if (status === 503) {
        setCmdError('MQTT desconectado — reintenta en unos segundos')
      } else if (status === 401) {
        setCmdError('Sesión expirada — recarga la página')
      } else if (serverMsg) {
        setCmdError(serverMsg)
      } else {
        setCmdError('Error de conexión con el servidor')
      }
    } finally {
      setSending(false)
    }
  }

  const isOn = actuator.state === 'ON'
  const label = CHANNEL_LABELS[actuator.channel] || `Canal ${actuator.channel}`

  return (
    <div className={`actuator-control ${isOn ? 'on' : 'off'}`}>
      <div className="actuator-info">
        <span className="actuator-label">{label}</span>
        <span className="actuator-channel">CH{actuator.channel}</span>
      </div>
      <div className="actuator-state-row">
        <span className={`actuator-state ${isOn ? 'on' : 'off'}`}>
          {isOn ? 'ENCENDIDO' : 'APAGADO'}
        </span>
        {actuator.mode && (
          <span className="actuator-mode">{actuator.mode}</span>
        )}
      </div>
      <button
        className={`actuator-btn ${isOn ? 'off' : 'on'}`}
        onClick={handleToggle}
        disabled={sending}
      >
        {sending ? '...' : isOn ? 'Apagar' : 'Encender'}
      </button>
      {cmdError && (
        <p className="actuator-error">{cmdError}</p>
      )}
    </div>
  )
}

export default ActuatorControl
