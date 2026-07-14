export default function CompoundBar({ compound, maxRef = 50 }) {
  const { name, avgConcentration, minConcentration, maxConcentration, unit, sampleCount } = compound
  const barWidth = Math.min((avgConcentration / maxRef) * 100, 100)

  const getColor = (name) => {
    if (name.includes('glucan')) return 'bg-primary'
    if (name.includes('triterpen')) return 'bg-tertiary'
    if (name.includes('erinacin')) return 'bg-secondary'
    if (name.includes('cordycepin')) return 'bg-amber'
    if (name.includes('PSK') || name.includes('PSP')) return 'bg-cyan'
    return 'bg-primary'
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-32 shrink-0">
        <span className="text-body-sm text-on-surface capitalize">{name.replace(/_/g, ' ')}</span>
      </div>
      <div className="flex-1">
        <div className="h-3 bg-surface-container-low rounded-full overflow-hidden">
          <div
            className={`h-full ${getColor(name)} rounded-full transition-all duration-500`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
      <div className="w-40 shrink-0 text-right">
        <span className="text-data-sm text-on-surface font-mono">
          {avgConcentration} {unit}
        </span>
        {sampleCount > 1 && (
          <span className="text-body-xs text-on-surface-variant ml-2">
            ({minConcentration}–{maxConcentration})
          </span>
        )}
      </div>
      <div className="w-16 shrink-0 text-right">
        <span className="font-label-caps text-9px text-on-surface-variant">
          n={sampleCount}
        </span>
      </div>
    </div>
  )
}
