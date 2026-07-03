import ToggleSwitch from '../ui/ToggleSwitch.jsx'

const DEFAULT_META = {
  1: { label: 'VENTILATION', icon: 'air', color: 'secondary' },
  2: { label: 'HEATER', icon: 'thermostat', color: 'primary' },
  3: { label: 'MIST', icon: 'humidity_high', color: 'primary' },
  4: { label: 'LIGHTS', icon: 'wb_sunny', color: 'secondary' },
}

function IntensityBar({ level = 0, total = 5, color = 'var(--spore-green)' }) {
  return (
    <div className="flex gap-[2px] flex-1">
      {Array.from({ length: total }, (_, i) => (
        <div key={i}
          className="flex-1 h-1 rounded-sm transition-all duration-300"
          style={{ background: i < level ? color : 'var(--surface-variant)' }} />
      ))}
    </div>
  )
}

function CmdStateBadge({ state }) {
  if (!state) return null
  const colors = {
    PENDING: 'text-amber border-amber/30 bg-amber/10',
    ACKED: 'text-primary border-primary/30 bg-primary/10',
    TIMEOUT: 'text-error border-error/30 bg-error/10',
  }
  return (
    <span className={`text-8px font-label-caps px-1.5 py-0.5 rounded border ${colors[state] || ''}`}>
      {state}
    </span>
  )
}

function ActuatorControl({ deviceId, actuator, meta, cmdState, onToggle, disabled }) {
  const resolvedMeta = meta || DEFAULT_META[actuator.channel] || { label: `CH${actuator.channel}`, icon: 'settings', color: 'primary' }
  const isOn = actuator.state === 'ON'
  const isError = actuator.state === 'ERROR' || actuator.state === 'TIMEOUT'
  const intensityLevel = isOn ? 5 : isError ? 1 : 2

  function handleToggle() {
    if (onToggle && !disabled) onToggle(actuator.channel)
  }

  return (
    <div className={`bg-surface-container-low p-3 rounded flex flex-col gap-2 border transition-all duration-300 ${isError ? 'border-error/40' : isOn ? 'border-primary/30' : 'border-outline-variant'}`}
      style={isOn ? { boxShadow: '0 0 8px var(--spore-glow)' } : {}}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`material-symbols-outlined text-sm shrink-0 ${isError ? 'text-error' : isOn ? 'text-primary' : 'text-on-surface-variant'}`}>
            {resolvedMeta.icon}
          </span>
          <span className={`font-label-caps text-9px truncate ${isError ? 'text-error' : 'text-on-surface-variant'}`}>
            {resolvedMeta.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <CmdStateBadge state={cmdState} />
          <ToggleSwitch
            checked={isOn}
            onChange={handleToggle}
            disabled={disabled || cmdState === 'PENDING' || isError}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-10px font-mono shrink-0 ${isError ? 'text-error' : isOn ? 'text-primary' : 'text-on-surface-variant opacity-50'}`}>
          {isError ? 'ERR' : isOn ? 'ON' : 'OFF'}
        </span>
        <IntensityBar level={intensityLevel} color={isError ? 'var(--error-red)' : 'var(--spore-green)'} />
        {actuator.mode && actuator.mode !== 'LOCAL' && (
          <span className="text-8px font-label-caps text-on-surface-variant shrink-0 border border-outline-variant/30 px-1 py-0.5 rounded">
            {actuator.mode}
          </span>
        )}
      </div>
    </div>
  )
}

export default ActuatorControl
