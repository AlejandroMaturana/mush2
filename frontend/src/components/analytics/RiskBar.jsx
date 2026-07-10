function RiskBar({ label, value, icon, severity }) {
  const colorMap = {
    low: 'bg-primary',
    moderate: 'bg-tertiary',
    high: 'bg-warning',
    critical: 'bg-error',
  }
  const severityMap = value <= 25 ? 'low' : value <= 50 ? 'moderate' : value <= 75 ? 'high' : 'critical'
  const barColor = colorMap[severity || severityMap]

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {icon && <span className="material-symbols-outlined text-16px text-on-surface-variant">{icon}</span>}
          <span className="font-label-caps text-10px text-on-surface-variant">{label}</span>
        </div>
        <span className={`font-label-caps text-10px ${barColor.replace('bg-', 'text-')}`}>{value}%</span>
      </div>
      <div className="h-2 bg-surface-dim rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

export default RiskBar
