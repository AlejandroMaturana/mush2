const RESET_REASON_MAP = {
  0: { label: 'Sin reinicio', variant: 'info' },
  1: { label: 'Encendido', variant: 'info' },
  2: { label: 'Reset interno', variant: 'info' },
  3: { label: 'Reset por software', variant: 'info' },
  4: { label: 'Panic', variant: 'critical' },
  5: { label: 'Interrupt watchdog', variant: 'critical' },
  6: { label: 'Task watchdog', variant: 'critical' },
  9: { label: 'Brownout', variant: 'warning' },
  12: { label: 'Encendido', variant: 'info' },
  14: { label: 'Brownout', variant: 'warning' },
}

function StatusDot({ variant }) {
  const colors = {
    info: 'var(--outline)',
    warning: 'var(--amber)',
    critical: 'var(--error-red)',
  }
  return (
    <span style={{
      width: '8px', height: '8px', borderRadius: '50%',
      background: colors[variant] || colors.info,
      display: 'inline-block', marginRight: '6px',
    }} />
  )
}

export default function ResetReasonBadge({ code }) {
  const { label, variant } = RESET_REASON_MAP[code] || { label: `Código ${code}`, variant: 'info' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: '12px', fontWeight: 500,
      color: variant === 'critical' ? 'var(--error-red)' : variant === 'warning' ? 'var(--amber)' : 'var(--on-surface-variant)',
    }}>
      <StatusDot variant={variant} />
      {label}
    </span>
  )
}
