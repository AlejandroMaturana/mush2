function CompoundBar({ compounds = [] }) {
  if (compounds.length === 0) return null

  const total = compounds.reduce((sum, c) => sum + (c.percentage || 0), 0)

  const COLORS = [
    'var(--spore-green)',
    'var(--teal)',
    'var(--amber)',
    'var(--tertiary)',
    'var(--info)',
    'var(--purple)',
  ]

  return (
    <div>
      <div className="chart-panel-label mb-2">PERFIL DE COMPUESTOS</div>
      <div className="h-3 rounded-full overflow-hidden flex bg-surface-container-highest">
        {compounds.map((c, i) => (
          <div
            key={c.name}
            className="h-full transition-all"
            style={{
              width: `${(c.percentage / total) * 100}%`,
              background: COLORS[i % COLORS.length],
            }}
            title={`${c.name}: ${c.percentage}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {compounds.map((c, i) => (
          <div key={c.name} className="flex items-center gap-1.5 text-8px">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-on-surface-variant">{c.name}</span>
            <span className="text-on-surface font-mono">{c.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CompoundBar
