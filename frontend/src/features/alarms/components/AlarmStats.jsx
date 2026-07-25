import { useAlarms } from '../../../app/providers/AlarmProvider'

function AlarmStats() {
  const stats = useAlarms()

  const items = [
    { label: 'CRÍTICA', value: stats.critical, color: 'var(--error)' },
    { label: 'ALTA', value: stats.high, color: 'var(--amber)' },
    { label: 'MEDIA', value: stats.medium, color: 'var(--info)' },
    { label: 'BAJA', value: stats.low, color: 'var(--on-surface-variant)' },
  ]

  return (
    <div className="flex gap-3">
      {items.map(item => (
        <div key={item.label} className="glass-card rounded-lg p-3 flex-1 text-center">
          <div className="text-data-xl font-mono" style={{ color: item.color }}>{item.value}</div>
          <div className="text-8px font-label-caps text-on-surface-variant mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

export default AlarmStats
