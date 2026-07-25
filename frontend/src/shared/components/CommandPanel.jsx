import { useState } from 'react'

function CommandPanel({ commands = [], onExecute, disabled = false, title = 'Acciones rápidas' }) {
  const [loading, setLoading] = useState(null)

  const handleExecute = async (command) => {
    if (disabled || loading) return
    setLoading(command.id)
    try {
      await onExecute?.(command)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="command-panel">
      <h4 className="command-panel-title">{title}</h4>
      <div className="command-panel-grid">
        {commands.map((cmd) => (
          <button
            key={cmd.id}
            className={`command-panel-btn ${cmd.variant || ''}`}
            onClick={() => handleExecute(cmd)}
            disabled={disabled || loading !== null}
          >
            <span className="material-symbols-outlined">{cmd.icon}</span>
            <span className="command-panel-btn-label">{cmd.label}</span>
            {loading === cmd.id && (
              <span className="command-panel-btn-loading" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default CommandPanel
