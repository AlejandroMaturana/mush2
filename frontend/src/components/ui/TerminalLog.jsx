function TerminalLog({ entries = [], onExtract }) {
  return (
    <div className="terminal-log rounded-card flex flex-col">
      <div className="terminal-header">
        <span className="text-label-caps text-on-surface">SYS.LOG.TERMINAL</span>
        <span className="material-symbols-outlined text-12px text-on-surface-variant">terminal</span>
      </div>
      <div className="terminal-body flex-1 overflow-y-auto" style={{ minHeight: 80 }}>
        {entries.length === 0 ? (
          <div className="terminal-entry">
            <span className="msg-info">[--:--:--] Waiting for data...</span>
          </div>
        ) : (
          entries.map((entry, i) => (
            <div key={i} className="terminal-entry">
              <span className="ts">{entry.ts}</span>
              <span className={`msg-${entry.type || 'info'}`}> {entry.text}</span>
            </div>
          ))
        )}
      </div>
      {onExtract && (
        <button className="bg-surface-container-high text-on-surface-variant font-label-caps text-8px py-1 border-t border-outline-variant hover:text-primary" onClick={onExtract}>
          FULL_EXTRACT.SH
        </button>
      )}
    </div>
  )
}

export default TerminalLog
