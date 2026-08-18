function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      className={`toggle-switch ${checked ? 'on' : 'off'}${disabled ? ' opacity-50 cursor-not-allowed' : ''}`}
      onClick={disabled ? undefined : () => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled) onChange(!checked) } }}
    >
      <div className="toggle-knob" />
    </button>
  )
}

export default ToggleSwitch
