const RESOLUTIONS = {
  RAW: { value: 0, label: 'RAW' },
  MINUTE: { value: 1, label: '1m' },
  FIVE_MINUTES: { value: 5, label: '5m' },
  FIFTEEN_MINUTES: { value: 15, label: '15m' },
  HOUR: { value: 60, label: '1h' },
  SIX_HOURS: { value: 360, label: '6h' },
  DAY: { value: 1440, label: '1d' },
}

const TIME_RANGES = [
  { label: '15m', value: '15m', limit: 15, hours: 0.25, resolution: RESOLUTIONS.RAW },
  { label: '1H', value: '1h', limit: 500, hours: 1, resolution: RESOLUTIONS.RAW },
  { label: '6H', value: '6h', limit: 200, hours: 6, resolution: RESOLUTIONS.FIVE_MINUTES },
  { label: '1D', value: '1d', limit: 500, hours: 24, resolution: RESOLUTIONS.FIFTEEN_MINUTES },
  { label: '3D', value: '3d', limit: 500, hours: 72, resolution: RESOLUTIONS.HOUR },
  { label: '7D', value: '7d', limit: 2000, hours: 168, resolution: RESOLUTIONS.HOUR },
]

class TemporalEngine {
  static RESOLUTIONS = RESOLUTIONS
  static TIME_RANGES = TIME_RANGES

  static formatDate(date, format) {
    const d = date instanceof Date ? date : new Date(date)
    const pad = n => String(n).padStart(2, '0')
    switch (format) {
      case 'HH:mm': return `${pad(d.getHours())}:${pad(d.getMinutes())}`
      case 'DD/MM HH:mm': return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
      case 'DD/MM': return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
      default: return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  }

  static pickTimeFormat(hours) {
    return hours <= 24 ? 'HH:mm' : 'DD/MM HH:mm'
  }

  static reshapeRows(rows) {
    const byTime = {}
    for (const r of rows) {
      const t = r.timestamp ? new Date(r.timestamp).getTime() : Date.now()
      if (!byTime[t]) byTime[t] = {}
      byTime[t][r.sensorType] = parseFloat(r.value)
    }
    const sorted = Object.entries(byTime).sort(([a], [b]) => Number(a) - Number(b))
    return sorted.map(([ts, v]) => ({
      t: new Date(Number(ts)),
      temp: v.TEMPERATURE ?? null,
      hum: v.HUMIDITY ?? null,
      eco2: v.CO2 ?? null,
      tvoc: v.VOC ?? null,
    }))
  }

  static aggregate(data, resolution, type = 'mean') {
    if (!data || data.length === 0 || resolution.value === 0) return data
    const intervalMs = resolution.value * 60 * 1000
    const buckets = new Map()

    for (const point of data) {
      const ts = point.t instanceof Date ? point.t.getTime() : new Date(point.t).getTime()
      const bucketKey = Math.floor(ts / intervalMs) * intervalMs
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, { temp: [], hum: [], eco2: [], tvoc: [] })
      const bucket = buckets.get(bucketKey)
      if (point.temp != null) bucket.temp.push(point.temp)
      if (point.hum != null) bucket.hum.push(point.hum)
      if (point.eco2 != null) bucket.eco2.push(point.eco2)
      if (point.tvoc != null) bucket.tvoc.push(point.tvoc)
    }

    const reduceFn = type === 'max' ? (arr) => Math.max(...arr)
      : type === 'min' ? (arr) => Math.min(...arr)
      : (arr) => arr.reduce((s, v) => s + v, 0) / arr.length

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([ts, vals]) => ({
        t: new Date(ts),
        temp: vals.temp.length > 0 ? Math.round(reduceFn(vals.temp) * 10) / 10 : null,
        hum: vals.hum.length > 0 ? Math.round(reduceFn(vals.hum) * 10) / 10 : null,
        eco2: vals.eco2.length > 0 ? Math.round(reduceFn(vals.eco2)) : null,
        tvoc: vals.tvoc.length > 0 ? Math.round(reduceFn(vals.tvoc)) : null,
      }))
  }

  static formatForChart(aggregatedData, timeFormat) {
    if (!aggregatedData || aggregatedData.length === 0) {
      return { labels: [], temp: [], hum: [], eco2: [], tvoc: [] }
    }
    return {
      labels: aggregatedData.map(d => TemporalEngine.formatDate(d.t, timeFormat)),
      temp: aggregatedData.map(d => d.temp),
      hum: aggregatedData.map(d => d.hum),
      eco2: aggregatedData.map(d => d.eco2),
      tvoc: aggregatedData.map(d => d.tvoc),
    }
  }
}

export default TemporalEngine
