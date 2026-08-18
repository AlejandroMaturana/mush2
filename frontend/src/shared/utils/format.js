export function formatDate(date, format = 'DD/MM HH:mm') {
  const d = date instanceof Date ? date : new Date(date)
  const pad = n => String(n).padStart(2, '0')
  switch (format) {
    case 'HH:mm': return `${pad(d.getHours())}:${pad(d.getMinutes())}`
    case 'DD/MM HH:mm': return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    case 'DD/MM': return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
    case 'YYYY-MM-DD': return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    case 'relative': return getRelativeTime(d)
    default: return d.toLocaleString()
  }
}

function getRelativeTime(date) {
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)
  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin}m`
  if (diffH < 24) return `hace ${diffH}h`
  return `hace ${diffD}d`
}

export function formatNumber(value, decimals = 0) {
  if (value == null || isNaN(value)) return '--'
  return Number(value).toFixed(decimals)
}

export function formatJSON(val) {
  if (!val) return '--'
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(val)
  }
}

export function formatBytes(bytes) {
  if (bytes == null) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function formatUptime(seconds) {
  if (seconds == null) return '--'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function formatTimeAgo(seconds) {
  if (seconds == null) return 'Nunca'
  if (seconds < 5) return 'Hace un momento'
  if (seconds < 60) return `Hace ${seconds}s`
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `Hace ${h}h ${m}m`
}
