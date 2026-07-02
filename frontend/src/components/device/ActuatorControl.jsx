import { useState } from 'react'
import { setActuatorDirect } from '../../api/client.js'

const CHANNEL_META = {
  1: { label: 'VENTILATION', icon: 'air', color: 'secondary' },
  2: { label: 'HEATER', icon: 'thermostat', color: 'primary' },
  3: { label: 'MIST', icon: 'humidity_high', color: 'primary' },
  4: { label: 'LIGHTS', icon: 'wb_sunny', color: 'secondary' },
}

function ActuatorControl({ deviceId, actuator, onCommandSent }) {
  const [sending, setSending] = useState(false)
  const [cmdError, setCmdError] = useState(null)
  const meta = CHANNEL_META[actuator.channel] || { label: `CH${actuator.channel}`, icon: 'settings', color: 'primary' }
  const isOn = actuator.state === 'ON'

  async function handleToggle() {
    const newState = isOn ? 'OFF' : 'ON'
    setSending(true)
    setCmdError(null)
    try {
      await setActuatorDirect(deviceId, actuator.channel, newState)
      if (onCommandSent) onCommandSent(actuator.channel, newState)
    } catch (err) {
      const status = err.response?.status
      const serverMsg = err.response?.data?.message || err.response?.data?.error
      if (status === 401) {
        setCmdError('Session expired — reload page')
      } else if (serverMsg) {
        setCmdError(serverMsg)
      } else {
        setCmdError('Connection error')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`bg-surface-container border border-outline-variant rounded-card p-3 flex flex-col justify-between${cmdError ? ' border-error/40' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-${meta.color} text-xl`}>{meta.icon}</span>
          <span className="font-label-caps text-10px text-on-surface">{meta.label}</span>
        </div>
        <button
          onClick={handleToggle}
          disabled={sending}
          className={`w-8 h-4 rounded-full relative p-0.5 border transition-all cursor-pointer${sending ? ' opacity-50 cursor-not-allowed' : ''} ${isOn ? `bg-${meta.color}` : 'bg-outline-variant border-outline-variant'}`}
          style={isOn ? { boxShadow: `0 0 8px var(--${meta.color === 'primary' ? 'spore-green' : 'teal'})` } : undefined}
        >
          <div className={`w-3 h-3 rounded-full transition-all ${isOn ? ` bg-on-${meta.color === 'primary' ? 'primary' : 'secondary'} absolute right-0.5` : ' bg-on-surface-variant absolute left-0.5'}`} />
        </button>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className={`font-data-sm ${isOn ? 'text-primary' : 'text-on-surface-variant opacity-50'}`}>
          {isOn ? 'ACTIVE' : 'OFF'}
        </span>
        {actuator.mode && (
          <span className="text-8px font-label-caps text-on-surface-variant">{actuator.mode}</span>
        )}
      </div>
      {cmdError && (
        <p className="text-9px font-label-caps text-error mt-1">{cmdError}</p>
      )}
    </div>
  )
}

export default ActuatorControl
