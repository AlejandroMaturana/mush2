import { useState, useEffect } from 'react'

function MqttStatusPanel({ data }) {
  if (!data) return null

  const statusColor = data.connected ? 'var(--spore-green)' : 'var(--error)'
  const statusLabel = data.connected ? 'Conectado' : 'Desconectado'

  return (
    <div className="glass-card rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-18px">cell_tower</span>
        <span className="chart-panel-label">MQTT STATUS</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-8px font-label-caps text-on-surface-variant mb-1">ESTADO</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
            <span className="text-body-sm text-on-surface">{statusLabel}</span>
          </div>
        </div>
        <div>
          <div className="text-8px font-label-caps text-on-surface-variant mb-1">BROKER</div>
          <span className="text-body-sm text-on-surface font-mono">{data.broker || '—'}</span>
        </div>
        <div>
          <div className="text-8px font-label-caps text-on-surface-variant mb-1">MENSAJES</div>
          <span className="text-body-sm text-on-surface font-mono">{data.messagesReceived ?? 0}</span>
        </div>
      </div>
      {data.lastError && (
        <div className="mt-3 p-2 bg-error/10 border border-error/20 rounded text-8px text-error font-mono">
          {data.lastError}
        </div>
      )}
    </div>
  )
}

export default MqttStatusPanel
