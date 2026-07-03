const DEFAULT_META = {
  1: { label: 'AIR EXCHANGE', icon: 'air', sublabel: 'FAN_SPEED' },
  2: { label: 'MIST SPRAYERS', icon: 'humidity_high', sublabel: 'RESERVOIR' },
  3: { label: 'CO2 INJECTION', icon: 'co2', sublabel: 'FLOW_RATE' },
  4: { label: 'UV-C STERILIZER', icon: 'light', sublabel: 'INTENSITY' },
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <div
      className={`rounded-full relative shrink-0 cursor-pointer select-none transition-all duration-200 ${checked ? 'bg-primary' : 'bg-surface-variant'}`}
      style={{
        width: '22px',
        height: '12px',
        border: checked ? 'none' : '1px solid var(--outline-variant)',
        boxShadow: checked ? '0 0 5px rgba(107,251,154,0.25)' : 'none',
        opacity: disabled ? 0.5 : 1,
      }}
      onClick={() => { if (!disabled) onChange() }}
    >
      <div
        className={`rounded-full absolute top-[1.5px] transition-all duration-200 ${checked ? 'bg-on-primary' : 'bg-outline'}`}
        style={{ width: '7px', height: '7px', right: checked ? '2.5px' : 'auto', left: checked ? 'auto' : '2.5px' }}
      />
    </div>
  )
}

function ActuatorControl({ actuator, meta, cmdState, onToggle, disabled }) {
  const rm = meta || DEFAULT_META[actuator.channel] || { label: `CH${actuator.channel}`, icon: 'settings', sublabel: 'STATE' }
  const isOn = actuator.state === 'ON'
  const isError = actuator.state === 'ERROR' || actuator.state === 'TIMEOUT'
  const isPending = cmdState === 'PENDING'

  function handleToggle() {
    if (onToggle && !disabled) onToggle(actuator.channel)
  }

  return (
    <div className="grid grid-cols-[1fr_auto] grid-rows-[1fr_auto] gap-0 h-full p-3 hover:bg-surface-variant/10 transition-colors">
      <div className="flex items-center gap-1.5 min-w-0 self-center">
        <span className={`material-symbols-outlined shrink-0 ${isError ? 'text-error' : isOn ? 'text-primary' : 'text-on-surface-variant'}`} style={{ fontSize: '14px' }}>{rm.icon}</span>
        <span className="font-label-caps text-[7px] text-on-surface truncate tracking-wider">{rm.label}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5 self-start">
        <Toggle checked={isOn} onChange={handleToggle} disabled={disabled || isPending || isError} />
        <span className={`font-mono text-[6px] ${isPending ? 'text-amber' : cmdState === 'TIMEOUT' ? 'text-error' : isOn ? 'text-primary/70' : 'text-on-surface-variant/40'}`}>
          {isPending ? 'PEND' : cmdState === 'TIMEOUT' ? 'T/O' : isOn ? 'ON' : 'STBY'}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 self-end">
        <span className={`font-mono text-sm font-bold leading-none ${isError ? 'text-error' : isOn ? 'text-primary' : 'text-on-surface-variant'}`}>
          {isError ? 'ERR' : isOn ? 'ON' : 'OFF'}
        </span>
        <span className="text-[6px] font-label-caps text-on-surface-variant/60 tracking-wider">{rm.sublabel}</span>
      </div>
      <div className="self-end justify-self-end">
        <span className={`text-[6px] font-label-caps ${actuator.mode === 'REMOTE' ? 'text-primary/70' : 'text-on-surface-variant/40'}`}>
          {actuator.mode || 'LOCAL'}
        </span>
      </div>
    </div>
  )
}

export default ActuatorControl
