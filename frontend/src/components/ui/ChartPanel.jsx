import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { getTelemetryHistory } from '../../api/client.js'

Chart.register(...registerables)

const TIME_RANGES = [
  { label: '1H', value: '1h', limit: 500,  hours: 1,  resolution: 0   },
  { label: '6H', value: '6h', limit: 200,  hours: 6,  resolution: 5   },
  { label: '1D', value: '1d', limit: 500,  hours: 24, resolution: 15  },
  { label: '3D', value: '3d', limit: 500,  hours: 72, resolution: 60  },
  { label: '7D', value: '7d', limit: 2000, hours: 168,resolution: 60  },
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
      grid: { color: 'rgba(255,255,255,0.04)', drawTicks: false },
      ticks: { color: '#bccabb', font: { family: 'JetBrains Mono, monospace', size: 9 }, maxTicksLimit: 6 },
      border: { color: 'transparent' },
    },
    y1: {
      grid: { color: 'rgba(255,255,255,0.04)', drawTicks: false },
      ticks: { color: '#bccabb', font: { family: 'JetBrains Mono, monospace', size: 9 }, maxTicksLimit: 5 },
      border: { color: 'transparent' },
      position: 'left',
    },
    y2: {
      grid: { drawOnChartArea: false, drawTicks: false },
      ticks: { color: '#bccabb', font: { family: 'JetBrains Mono, monospace', size: 9 }, maxTicksLimit: 5 },
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

  function fmtTime(ts, fmt) {
    const d = new Date(ts)
    const pad = (n) => String(n).padStart(2, '0')
    if (fmt === 'HH:mm') return `${pad(d.getHours())}:${pad(d.getMinutes())}`
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function pickFormat(hours) {
    return hours <= 24 ? 'HH:mm' : 'DD/MM HH:mm'
  }

  async function loadHistory(range) {
    if (!deviceId) return
    setLoading(true)
    const entry = TIME_RANGES.find(t => t.value === range)
    const limit = entry ? entry.limit : 500
    const resolution = entry ? entry.resolution : 0
    cancelledRef.current = false
    currentRange.current = range
    try {
      const rows = await getTelemetryHistory(deviceId, { limit, resolution })
      if (cancelledRef.current || currentRange.current !== range) return
      const reshaped = reshapeRows(rows)
      const fmt = pickFormat(entry ? entry.hours : 24)
      setLabels(reshaped.map(r => fmtTime(r.t, fmt)))
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

  const SX = {
    section: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '9px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: '2px' },
    wrapper: { display: 'flex', gap: 0, height: '380px' },
    sidebar: { display: 'flex', flexDirection: 'column', gap: '2px', width: '36px', flexShrink: 0, paddingTop: '32px', paddingBottom: '8px' },
    chartBox: { flex: 1, background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 },
    chartInner: { flex: 1, display: 'flex', minHeight: 0 },
    pane: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
    paneBorder: { borderRight: '1px solid rgba(61,74,62,0.3)' },
    barHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 4px' },
    barLabel: { fontSize: '8px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' },
    badge: (c) => ({ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${c}40`, background: `${c}08` }),
    dot: (c) => ({ width: '6px', height: '6px', borderRadius: '50%', background: c, display: 'inline-block', boxShadow: `0 0 4px ${c}` }),
    badgeLabel: (c) => ({ fontSize: '7px', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c }),
    canvasWrap: { flex: 1, position: 'relative', padding: '0 8px 8px' },
    canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', padding: '12px 4px 4px' },
    footer: { display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 12px', borderTop: '1px solid rgba(61,74,62,0.3)', background: 'rgba(38,43,41,0.5)' },
    legendItem: { display: 'flex', alignItems: 'center', gap: '4px' },
    legendLine: (c) => ({ width: '10px', height: '2px', borderRadius: '1px', background: c }),
    legendLabel: { fontSize: '7px', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' },
    optimal: { width: '10px', height: '4px', border: '1px dashed rgba(34,197,94,0.3)', borderRadius: '1px', background: 'rgba(34,197,94,0.07)' },
    loading: { fontSize: '7px', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--spore-green)', marginLeft: 'auto' },
  }

  return (
    <section style={SX.section}>
      <div style={SX.label}>HISTORY CHARTS</div>
      <div style={SX.wrapper}>
        <div style={SX.sidebar}>
          {TIME_RANGES.map(tr => (
            <button
              key={tr.value}
              onClick={() => setTimeRange(tr.value)}
              style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '7px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                border: 'none',
                background: timeRange === tr.value ? 'rgba(107,251,154,0.08)' : 'transparent',
                color: timeRange === tr.value ? 'var(--spore-green)' : 'var(--on-surface-variant)',
                borderLeft: timeRange === tr.value ? '2px solid var(--spore-green)' : '2px solid transparent',
                padding: '2px 6px',
                borderRadius: 0,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              {tr.label}
            </button>
          ))}
        </div>
        <div style={SX.chartBox}>
          <div style={SX.chartInner}>
            <div style={{ ...SX.pane, ...SX.paneBorder }}>
              <div style={SX.barHeader}>
                <span style={SX.barLabel}>TEMPERATURE & HUMIDITY</span>
                <div className="flex gap-2">
                  {['temp', 'hum'].map(k => (
                    <div key={k} style={SX.badge(timeColors[k])}>
                      <span style={SX.dot(timeColors[k])} />
                      <span style={SX.badgeLabel(timeColors[k])}>{k === 'temp' ? 'T°' : 'HR%'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={SX.canvasWrap}>
                <canvas ref={canvas1Ref} style={SX.canvas} />
              </div>
            </div>
            <div style={SX.pane}>
              <div style={SX.barHeader}>
                <span style={SX.barLabel}>ECO₂ & TVOC</span>
                <div className="flex gap-2">
                  {['eco2', 'tvoc'].map(k => (
                    <div key={k} style={SX.badge(timeColors[k])}>
                      <span style={SX.dot(timeColors[k])} />
                      <span style={SX.badgeLabel(timeColors[k])}>{k === 'eco2' ? 'eCO₂' : 'TVOC'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={SX.canvasWrap}>
                <canvas ref={canvas2Ref} style={SX.canvas} />
              </div>
            </div>
          </div>
          <div style={SX.footer}>
            {[
              { id: 't', c: timeColors.temp, lbl: `Temp ${has.temp ? telemetry.temperature.toFixed(1) : '--'} °C` },
              { id: 'h', c: timeColors.hum, lbl: `Hum ${has.hum ? telemetry.humidity.toFixed(1) : '--'} %RH` },
              { id: 'e', c: timeColors.eco2, lbl: `eCO₂ ${has.eco2 ? Math.round(telemetry.co2) : '--'} ppm` },
              { id: 'v', c: timeColors.tvoc, lbl: `TVOC ${has.tvoc ? Math.round(telemetry.voc) : '--'} ppb` },
            ].map(item => (
              <div key={item.id} style={SX.legendItem}>
                <span style={SX.legendLine(item.c)} />
                <span style={SX.legendLabel}>{item.lbl}</span>
              </div>
            ))}
            <div style={SX.legendItem}>
              <span style={SX.optimal} />
              <span style={SX.legendLabel}>optimal</span>
            </div>
            {loading && <span style={SX.loading}>loading...</span>}
          </div>
        </div>
      </div>
    </section>
  )
}

function reshapeRows(rows) {
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

export default ChartPanel
