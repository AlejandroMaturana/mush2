import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { getTelemetryHistory } from '../../api/client.js'

Chart.register(...registerables)

const TIME_RANGES = [
  { label: '1H', value: '1h', limit: 60, desc: '60 min' },
  { label: '6H', value: '6h', limit: 30, desc: '30 min' },
  { label: '1D', value: '1d', limit: 24, desc: '1 hora' },
  { label: '3D', value: '3d', limit: 72, desc: '1 hora' },
  { label: '7D', value: '7d', limit: 168, desc: '1 hora' },
]

function computeRanges(datasets, margin, bands) {
  const byAxis = {}
  for (const ds of datasets) {
    const aid = ds.yAxisID || 'y'
    if (!byAxis[aid]) byAxis[aid] = { values: [] }
    for (const v of ds.data || []) {
      if (v != null && !Number.isNaN(v) && isFinite(v)) {
        byAxis[aid].values.push(v)
      }
    }
  }
  if (bands) {
    for (const b of bands) {
      if (!byAxis[b.ax]) byAxis[b.ax] = { values: [] }
      byAxis[b.ax].values.push(b.min, b.max)
    }
  }
  const ranges = {}
  for (const [aid, { values }] of Object.entries(byAxis)) {
    if (values.length === 0) {
      ranges[aid] = { min: 0, max: 100 }
      continue
    }
    let rawMin = Math.min(...values)
    let rawMax = Math.max(...values)
    let span = rawMax - rawMin
    if (span === 0) span = rawMax === 0 ? 100 : rawMax * 0.5
    ranges[aid] = {
      min: Math.floor(rawMin - span * margin),
      max: Math.ceil(rawMax + span * margin),
    }
  }
  return ranges
}

function updateAxisRanges(chart, datasets, bands, margin) {
  if (!chart) return
  const ranges = computeRanges(datasets, margin, bands)
  for (const [aid, { min, max }] of Object.entries(ranges)) {
    const sc = chart.options.scales[aid]
    if (sc) {
      sc.min = min
      sc.max = max
    }
  }
}

function makeOptimalBands() {
  return {
    id: 'refBands',
    beforeDraw(chart) {
      const bands = chart.__bands
      if (!bands) return
      const { ctx, chartArea: { left, right } } = chart
      for (const b of bands) {
        const sc = chart.scales[b.ax]
        if (!sc) continue
        const y1 = sc.getPixelForValue(b.max)
        const y2 = sc.getPixelForValue(b.min)
        ctx.fillStyle = b.fill
        ctx.fillRect(left, y1, right - left, y2 - y1)
        ctx.strokeStyle = b.stroke
        ctx.setLineDash([3, 5])
        ctx.lineWidth = 0.7
        ctx.strokeRect(left, y1, right - left, y2 - y1)
        ctx.setLineDash([])
      }
    },
  }
}

const REF_BANDS_PLUGIN = makeOptimalBands()

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  elements: { point: { radius: 0 } },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(7,9,10,0.95)',
      borderColor: 'rgba(255,255,255,0.09)',
      borderWidth: 1,
      titleColor: '#4a6652',
      bodyColor: '#dce8e0',
      padding: 8,
      titleFont: { family: 'JetBrains Mono, monospace', size: 9 },
      bodyFont: { family: 'JetBrains Mono, monospace', size: 9 },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.03)', drawTicks: false },
      ticks: { color: '#2e4036', font: { family: 'JetBrains Mono, monospace', size: 7 }, maxTicksLimit: 6 },
      border: { color: 'transparent' },
    },
    y1: {
      grid: { color: 'rgba(255,255,255,0.03)', drawTicks: false },
      ticks: { color: '#2e4036', font: { family: 'JetBrains Mono, monospace', size: 7 }, maxTicksLimit: 5 },
      border: { color: 'transparent' },
      position: 'left',
    },
    y2: {
      grid: { drawOnChartArea: false, drawTicks: false },
      ticks: { color: '#2e4036', font: { family: 'JetBrains Mono, monospace', size: 7 }, maxTicksLimit: 5 },
      border: { color: 'transparent' },
      position: 'right',
    },
  },
}

function ChartPanel({ deviceId, telemetry, has }) {
  const [timeRange, setTimeRange] = useState('6h')
  const [labels, setLabels] = useState([])
  const [data1, setData1] = useState({ temp: [], hum: [] })
  const [data2, setData2] = useState({ eco2: [], tvoc: [] })
  const [loading, setLoading] = useState(false)

  const canvas1Ref = useRef(null)
  const canvas2Ref = useRef(null)
  const chart1Ref = useRef(null)
  const chart2Ref = useRef(null)

  const currentRange = useRef('6h')
  const cancelledRef = useRef(false)

  const timeColors = {
    temp: '#f59e0b',
    hum: '#38bdf8',
    eco2: '#a78bfa',
    tvoc: '#fb7185',
  }

  const chart1Bands = [
    { ax: 'y1', min: 22, max: 28, fill: 'rgba(245,158,11,0.06)', stroke: 'rgba(245,158,11,0.22)' },
    { ax: 'y2', min: 70, max: 90, fill: 'rgba(56,189,248,0.06)', stroke: 'rgba(56,189,248,0.22)' },
  ]
  const chart2Bands = [
    { ax: 'y1', min: 800, max: 2000, fill: 'rgba(167,139,250,0.06)', stroke: 'rgba(167,139,250,0.22)' },
    { ax: 'y2', min: 0, max: 500, fill: 'rgba(251,113,133,0.06)', stroke: 'rgba(251,113,133,0.22)' },
  ]

  async function loadHistory(range) {
    if (!deviceId) return
    setLoading(true)
    const entry = TIME_RANGES.find(t => t.value === range)
    const limit = entry ? entry.limit : 30
    cancelledRef.current = false
    currentRange.current = range
    try {
      const rows = await getTelemetryHistory(deviceId, { limit })
      if (cancelledRef.current || currentRange.current !== range) return
      const reshaped = reshapeRows(rows)
      setLabels(reshaped.map(r => r.t))
      setData1({ temp: reshaped.map(r => r.temp ?? 0), hum: reshaped.map(r => r.hum ?? 0) })
      setData2({ eco2: reshaped.map(r => r.eco2 ?? 0), tvoc: reshaped.map(r => r.tvoc ?? 0) })
    } catch {
      if (!cancelledRef.current) {
        setLabels([])
        setData1({ temp: [], hum: [] })
        setData2({ eco2: [], tvoc: [] })
      }
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    cancelledRef.current = false
    loadHistory(timeRange)
    return () => { cancelledRef.current = true }
  }, [deviceId, timeRange])

  function initChart(canvas, bands) {
    const c = new Chart(canvas, {
      type: 'line',
      data: { labels: [], datasets: [] },
      plugins: [REF_BANDS_PLUGIN],
      options: CHART_OPTS,
    })
    c.__bands = bands
    return c
  }

  function updateChart(chart, labels, datasets, bands) {
    chart.data.labels = labels
    chart.data.datasets = datasets
    chart.__bands = bands
    updateAxisRanges(chart, datasets, bands, 0.10)
    chart.update('none')
  }

  useEffect(() => {
    if (!canvas1Ref.current || !canvas2Ref.current) return
    chart1Ref.current = initChart(canvas1Ref.current, chart1Bands)
    chart2Ref.current = initChart(canvas2Ref.current, chart2Bands)
    return () => {
      chart1Ref.current?.destroy()
      chart2Ref.current?.destroy()
      chart1Ref.current = null
      chart2Ref.current = null
    }
  }, [])

  useEffect(() => {
    if (!chart1Ref.current || !chart2Ref.current) return
    const ds1 = [
      { label: 'Temp', data: data1.temp, yAxisID: 'y1', borderColor: timeColors.temp, borderWidth: 1.5, tension: 0.4 },
      { label: 'Hum', data: data1.hum, yAxisID: 'y2', borderColor: timeColors.hum, borderWidth: 1.5, borderDash: [4, 2], tension: 0.4 },
    ]
    const ds2 = [
      { label: 'eCO2', data: data2.eco2, yAxisID: 'y1', borderColor: timeColors.eco2, borderWidth: 1.5, tension: 0.4 },
      { label: 'TVOC', data: data2.tvoc, yAxisID: 'y2', borderColor: timeColors.tvoc, borderWidth: 1.5, borderDash: [4, 2], tension: 0.4 },
    ]
    updateChart(chart1Ref.current, labels, ds1, chart1Bands)
    updateChart(chart2Ref.current, labels, ds2, chart2Bands)
  }, [labels, data1, data2])

  return (
    <section className="flex flex-col gap-1">
      <div className="font-label-caps text-9px text-on-surface-variant tracking-wider px-0.5">HISTORY CHARTS</div>
      <div className="flex gap-0" style={{ height: '380px' }}>
        <div className="flex flex-col gap-0.5 w-9 shrink-0 pt-8 pb-2">
          {TIME_RANGES.map(tr => (
            <button
              key={tr.value}
              onClick={() => setTimeRange(tr.value)}
              className="flex-1 font-label-caps text-[7px] tracking-wider border-0 transition-all cursor-pointer"
              style={{
                background: timeRange === tr.value
                  ? 'rgba(107,251,154,0.08)'
                  : 'transparent',
                color: timeRange === tr.value
                  ? 'var(--primary, #6bfb9a)'
                  : 'var(--on-surface-variant, #bccabb)',
                borderLeft: timeRange === tr.value
                  ? '2px solid var(--primary, #6bfb9a)'
                  : '2px solid transparent',
                padding: '2px 6px',
                borderRadius: 0,
                textAlign: 'left',
                fontSize: '7px',
              }}
            >
              {tr.label}
            </button>
          ))}
        </div>
        <div className="flex-1 bg-surface-container rounded border border-outline-variant overflow-hidden flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 min-w-0 border-r border-outline-variant/30 flex flex-col">
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <span className="font-label-caps text-[8px] text-on-surface-variant tracking-wider">TEMPERATURE & HUMIDITY</span>
                <div className="flex gap-2">
                  {['temp', 'hum'].map(k => (
                    <div key={k} className="flex items-center gap-1 px-1.5 py-0.5 rounded border" style={{ borderColor: timeColors[k] + '40', background: timeColors[k] + '08' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: timeColors[k], boxShadow: `0 0 4px ${timeColors[k]}` }} />
                      <span className="font-label-caps text-[7px]" style={{ color: timeColors[k] }}>{k === 'temp' ? 'T°' : 'HR%'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 relative px-2 pb-2">
                <canvas ref={canvas1Ref} className="absolute inset-0 w-full h-full" style={{ padding: '12px 4px 4px' }} />
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <span className="font-label-caps text-[8px] text-on-surface-variant tracking-wider">ECO₂ & TVOC</span>
                <div className="flex gap-2">
                  {['eco2', 'tvoc'].map(k => (
                    <div key={k} className="flex items-center gap-1 px-1.5 py-0.5 rounded border" style={{ borderColor: timeColors[k] + '40', background: timeColors[k] + '08' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: timeColors[k], boxShadow: `0 0 4px ${timeColors[k]}` }} />
                      <span className="font-label-caps text-[7px]" style={{ color: timeColors[k] }}>{k === 'eco2' ? 'eCO₂' : 'TVOC'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 relative px-2 pb-2">
                <canvas ref={canvas2Ref} className="absolute inset-0 w-full h-full" style={{ padding: '12px 4px 4px' }} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-1.5 border-t border-outline-variant/30 bg-surface-container-high/50">
            {[
              { id: 't', c: timeColors.temp, lbl: `Temp ${has.temp ? telemetry.temperature.toFixed(1) : '--'} °C` },
              { id: 'h', c: timeColors.hum, lbl: `Hum ${has.hum ? telemetry.humidity.toFixed(1) : '--'} %RH` },
              { id: 'e', c: timeColors.eco2, lbl: `eCO₂ ${has.eco2 ? Math.round(telemetry.co2) : '--'} ppm` },
              { id: 'v', c: timeColors.tvoc, lbl: `TVOC ${has.tvoc ? Math.round(telemetry.voc) : '--'} ppb` },
            ].map(item => (
              <div key={item.id} className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 rounded-full" style={{ background: item.c }} />
                <span className="font-label-caps text-[7px] text-on-surface-variant">{item.lbl}</span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-1 rounded border border-dashed" style={{ borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.07)' }} />
              <span className="font-label-caps text-[7px] text-on-surface-variant">optimal</span>
            </div>
            {loading && <span className="font-label-caps text-[7px] text-primary ml-auto">loading...</span>}
          </div>
        </div>
      </div>
    </section>
  )
}

function reshapeRows(rows) {
  const byTime = {}
  for (const r of rows) {
    const t = r.timestamp ? new Date(r.timestamp) : new Date()
    const key = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`
    if (!byTime[key]) byTime[key] = {}
    byTime[key][r.sensorType] = parseFloat(r.value)
  }
  const sorted = Object.entries(byTime).sort(([a], [b]) => a.localeCompare(b))
  return sorted.map(([t, v]) => ({
    t,
    temp: v.TEMPERATURE ?? null,
    hum: v.HUMIDITY ?? null,
    eco2: v.CO2 ?? null,
    tvoc: v.VOC ?? null,
  }))
}

export default ChartPanel
