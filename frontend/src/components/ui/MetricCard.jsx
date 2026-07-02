function MetricCard({ icon, label, value, unit, trend, className, children }) {
  return (
    <div className={`glass-card p-4 rounded-xl flex flex-col gap-3 ${className || ''}`}>
      {(icon || label) && (
        <div className="flex items-center gap-2">
          {icon && <span className="material-symbols-outlined text-18px text-on-surface-variant">{icon}</span>}
          <span className="text-label-caps text-on-surface-variant">{label}</span>
        </div>
      )}
      <div className="flex items-baseline gap-1">
        <span className="text-display-data text-32px leading-none text-on-surface">{value}</span>
        {unit && <span className="font-mono text-xs text-on-surface-variant">{unit}</span>}
        {trend && (
          <span className={`text-data-sm ml-auto ${trend > 0 ? 'text-spore-green' : 'text-error-red'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

export default MetricCard
