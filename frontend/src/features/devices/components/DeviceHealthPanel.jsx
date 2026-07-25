import { useState, useEffect } from 'react'
import client from '../../../api/client'

function DeviceHealthPanel({ deviceId }) {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHealth() {
      try {
        const { data } = await client.get(`/devices/${deviceId}/health`)
        setHealth(data)
      } catch {}
      setLoading(false)
    }
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [deviceId])

  if (loading) return <div className="text-body-sm text-on-surface-variant p-4">Cargando estado de salud del dispositivo...</div>
  if (!health) return null

  const metrics = [
    { label: 'CPU', value: health.cpuUsage, unit: '%', max: 100, color: 'var(--spore-green)' },
    { label: 'Memoria', value: health.memoryUsage, unit: '%', max: 100, color: 'var(--teal)' },
    { label: 'Tiempo activo', value: health.uptime, unit: 's', display: formatUptime(health.uptime), color: 'var(--amber)' },
    { label: 'Heap libre', value: health.freeHeap, unit: 'B', display: formatBytes(health.freeHeap), color: 'var(--info)' },
  ]

  return (
    <div className="glass-card rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-18px">monitor_heart</span>
        <span className="chart-panel-label">SALUD DEL DISPOSITIVO</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="text-center">
            <div className="text-8px font-label-caps text-on-surface-variant mb-1">{m.label}</div>
            <div className="text-data-lg text-on-surface font-mono">
              {m.display || `${m.value ?? '--'}${m.unit}`}
            </div>
            {m.value != null && m.unit === '%' && (
              <div className="h-1 bg-surface-container-highest rounded-full mt-1 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, m.value)}%`, background: m.color }} />
              </div>
            )}
          </div>
        ))}
      </div>
      {health.lastError && (
        <div className="mt-3 p-2 bg-error/10 border border-error/20 rounded text-8px text-error font-mono">
          ÚLTIMO ERROR: {health.lastError}
        </div>
      )}
    </div>
  )
}

function formatUptime(seconds) {
  if (seconds == null) return '--'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatBytes(bytes) {
  if (bytes == null) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default DeviceHealthPanel
