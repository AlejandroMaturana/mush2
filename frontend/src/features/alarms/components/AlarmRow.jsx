const SEVERITY_CLASS = { CRITICAL: 'text-error', HIGH: 'text-warning', MEDIUM: 'text-info', LOW: 'text-on-surface-variant' }
const SEVERITY_LABEL = { CRITICAL: 'Crítica', HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baja' }

function AlarmRow({ alarm, onAcknowledge, onResolve }) {
  const isActive = !alarm.resolvedAt

  return (
    <tr className="border-b border-outline-variant hover:bg-surface-container-highest/20 transition-colors">
      <td className="p-3">
        <span className={`font-mono text-tag-sm ${SEVERITY_CLASS[alarm.severity]} uppercase`}>
          {SEVERITY_LABEL[alarm.severity]}
        </span>
      </td>
      <td className="p-3 text-body-sm text-on-surface">{alarm.type}</td>
      <td className="p-3 text-body-sm text-on-surface-variant max-w-xs truncate">{alarm.message}</td>
      <td className="p-3 text-body-sm text-on-surface-variant">
        {alarm.Device?.chamberName || alarm.Device?.deviceId || '—'}
      </td>
      <td className="p-3 text-body-xs text-on-surface-variant">
        {new Date(alarm.createdAt).toLocaleString()}
      </td>
      <td className="p-3">
        {isActive ? (
          <div className="flex gap-2">
            {!alarm.isAcknowledged && (
              <button className="btn btn-sm btn-outline" onClick={() => onAcknowledge(alarm.id)}>Acusar</button>
            )}
            <button className="btn btn-sm btn-primary" onClick={() => onResolve(alarm.id)}>Resolver</button>
          </div>
        ) : (
          <span className="text-body-xs text-on-surface-variant">Resuelta</span>
        )}
      </td>
    </tr>
  )
}

export default AlarmRow
