import ToggleSwitch from '../../../shared/components/ToggleSwitch.jsx'

const DEFAULT_META = {
  1: { label: 'VENTILACIÓN', icon: 'air', sublabel: 'EXTRACTOR' },
  2: { label: 'HUMIDIFICADOR', icon: 'humidity_high', sublabel: 'NEBULIZADOR' },
  3: { label: 'INYECCIÓN DE CO2', icon: 'co2', sublabel: 'FLUJO' },
  4: { label: 'ESTERILIZADOR UV-C', icon: 'light', sublabel: 'LÁMPARA' },
}

function ActuatorControl({ actuator, meta, cmdState, onToggle, disabled }) {
  const rm = meta || DEFAULT_META[actuator.channel] || { label: `CANAL ${actuator.channel}`, icon: 'settings', sublabel: 'ESTADO' }
  const isOn = actuator.state === 'ON'
  const isError = actuator.state === 'ERROR' || actuator.state === 'TIMEOUT'
  const isPending = cmdState === 'PENDING'

  function handleToggle() {
    if (onToggle && !disabled) onToggle(actuator.channel)
  }

  return (
    <div className="h-full" style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gridTemplateRows: '1fr auto',
      padding: '16px',
    }}>
      <div className="flex items-center" style={{ gap: '10px', minWidth: 0, alignSelf: 'center' }}>
        <span className={`material-symbols-outlined shrink-0 ${isError ? 'text-error' : isOn ? 'text-primary' : 'text-on-surface-variant'}`} style={{ fontSize: '28px' }}>{rm.icon}</span>
        <span className="text-on-surface" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rm.label}</span>
      </div>
      <div className="flex flex-col items-end" style={{ gap: '4px', alignSelf: 'start' }}>
        <ToggleSwitch checked={isOn} onChange={handleToggle} disabled={disabled || isPending || isError} />
        <span className={`font-mono ${isPending ? 'text-amber' : cmdState === 'TIMEOUT' ? 'text-error' : isOn ? 'text-primary' : 'text-on-surface-variant'}`} style={{ fontSize: '8px', opacity: isOn && !isPending ? 0.7 : undefined }}>
          {isPending ? 'PEND' : cmdState === 'TIMEOUT' ? 'T/O' : isOn ? 'ENC' : 'ESP'}
        </span>
      </div>
      <div className="flex items-baseline" style={{ gap: '8px', alignSelf: 'end' }}>
        <span className={`font-mono font-bold ${isError ? 'text-error' : isOn ? 'text-primary' : 'text-on-surface-variant'}`} style={{ fontSize: '22px', lineHeight: 1 }}>{isError ? 'ERR' : isOn ? 'ENC' : 'APAG'}</span>
        <span className="text-on-surface-variant" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>{rm.sublabel}</span>
      </div>
      <div style={{ alignSelf: 'end', justifySelf: 'end' }}>
        <span className={`${actuator.mode === 'REMOTE' ? 'text-primary' : 'text-on-surface-variant'}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: actuator.mode === 'REMOTE' ? 0.7 : 0.4 }}>{actuator.mode === 'REMOTE' ? 'REMOTOS' : 'LOCAL'}</span>
      </div>
    </div>
  )
}

export default ActuatorControl
