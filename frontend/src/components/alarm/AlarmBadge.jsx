import { Link } from 'react-router-dom'
import { useAlarms } from '../../contexts/AlarmContext.jsx'

const severityColor = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
}

function AlarmBadge() {
  const stats = useAlarms()

  if (stats.total === 0) return null

  const topSeverity = stats.critical > 0 ? 'critical' : stats.high > 0 ? 'high' : stats.medium > 0 ? 'medium' : 'low'

  return (
    <Link to="/alarms" className={`alarm-badge ${severityColor[topSeverity]}`}>
      <span className="material-symbols-outlined alarm-badge-icon">warning</span>
      <span className="alarm-badge-count">{stats.total}</span>
    </Link>
  )
}

export default AlarmBadge
