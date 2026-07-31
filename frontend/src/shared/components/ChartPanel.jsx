import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import client from '../api/axiosInstance'
import TemporalEngine from '../utils/TemporalEngine.js'

Chart.register(...registerables)

const TIME_RANGES = TemporalEngine.TIME_RANGES

function computeRanges(datasets, margin, bands) {
  const byAxis = {}
  for (const ds of datasets) {
    if (ds.hidden) continue
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
      const hasVisibleDataset = datasets.some(ds => (ds.yAxisID || 'y') === b.ax && !ds.hidden)
      if (!hasVisibleDataset) continue
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
        const isAxisVisible = chart.data.datasets.some(ds => (ds.yAxisID || 'y') === b.ax && !ds.hidden)
        if (!isAxisVisible) continue
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
  const [visibleLines, setVisibleLines] = useState({
    temp: true,
    hum: true,
    eco2: true,
    tvoc: true,
  })

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
    { ax: 'y1', min: 22, max: 28, fill: 'rgba(245,158,11,0.15)', stroke: 'rgba(245,158,11,0.40)' },
    { ax: 'y2', min: 70, max: 90, fill: 'rgba(56,189,248,0.15)', stroke: 'rgba(56,189,248,0.40)' },
  ]
  const chart2Bands = [
    { ax: 'y1', min: 800, max: 2000, fill: 'rgba(167,139,250,0.15)', stroke: 'rgba(167,139,250,0.40)' },
    { ax: 'y2', min: 0, max: 500, fill: 'rgba(251,113,133,0.15)', stroke: 'rgba(251,113,133,0.40)' },
  ]

  async function loadHistory(range) {
    if (!deviceId) return
    setLoading(true)
    const entry = TIME_RANGES.find(t => t.value === range)
    const limit = entry ? entry.limit : 500
    const resolution = entry ? entry.resolution.value : 0
    cancelledRef.current = false
    currentRange.current = range
    try {
      const resp = await client.get(`/devices/${deviceId}/telemetry`, { params: { limit, resolution } })
      const rows = Array.isArray(resp.data)
        ? resp.data
        : (resp.data && Array.isArray(resp.data.data)) ? resp.data.data : []
      if (cancelledRef.current || currentRange.current !== range) return
      const reshaped = TemporalEngine.reshapeRows(rows)
      const agg = entry && entry.resolution.value > 0
        ? TemporalEngine.aggregate(reshaped, entry.resolution, 'mean')
        : reshaped
      const fmt = TemporalEngine.pickTimeFormat(entry ? entry.hours : 24)
      const charted = TemporalEngine.formatForChart(agg, fmt)
      setLabels(charted.labels)
      setData1({ temp: charted.temp, hum: charted.hum })
      setData2({ eco2: charted.eco2, tvoc: charted.tvoc })
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
      { label: 'Temp', data: data1.temp, yAxisID: 'y1', borderColor: timeColors.temp, borderWidth: 1.5, tension: 0.4, hidden: !visibleLines.temp },
      { label: 'Hum', data: data1.hum, yAxisID: 'y2', borderColor: timeColors.hum, borderWidth: 1.5, borderDash: [4, 2], tension: 0.4, hidden: !visibleLines.hum },
    ]
    const ds2 = [
      { label: 'eCO2', data: data2.eco2, yAxisID: 'y1', borderColor: timeColors.eco2, borderWidth: 1.5, tension: 0.4, hidden: !visibleLines.eco2 },
      { label: 'TVOC', data: data2.tvoc, yAxisID: 'y2', borderColor: timeColors.tvoc, borderWidth: 1.5, borderDash: [4, 2], tension: 0.4, hidden: !visibleLines.tvoc },
    ]
    updateChart(chart1Ref.current, labels, ds1, chart1Bands)
    updateChart(chart2Ref.current, labels, ds2, chart2Bands)
  }, [labels, data1, data2, visibleLines])

  return (
    <section className="chart-panel-section">
      <div className="chart-panel-label">HISTORY CHARTS</div>
      <div className="chart-panel-wrapper">
        <div className="chart-panel-sidebar">
          {TIME_RANGES.map(tr => (
            <button
              key={tr.value}
              onClick={() => setTimeRange(tr.value)}
              className="chart-panel-time-btn"
              style={{
                background: timeRange === tr.value ? 'rgba(107,251,154,0.08)' : 'transparent',
                color: timeRange === tr.value ? 'var(--spore-green)' : 'var(--on-surface-variant)',
                borderLeft: timeRange === tr.value ? '2px solid var(--spore-green)' : '2px solid transparent',
              }}
            >
              {tr.label}
            </button>
          ))}
        </div>
        <div className="chart-panel-box">
          <div className="chart-panel-inner">
            <div className="chart-panel-pane chart-panel-pane-border">
              <div className="chart-panel-bar-header">
                <span className="chart-panel-bar-label">TEMPERATURE & HUMIDITY</span>
                <div className="flex gap-2">
                  {['temp', 'hum'].map(k => {
                    const isVisible = visibleLines[k]
                    const color = timeColors[k]
                    return (
                      <button
                        key={k}
                        onClick={() => setVisibleLines(prev => ({ ...prev, [k]: !prev[k] }))}
                        className="chart-panel-sensor-btn"
                        style={{
                          opacity: isVisible ? 1 : 0.35,
                          background: isVisible ? `${color}08` : 'transparent',
                          borderColor: isVisible ? `${color}40` : 'var(--outline-variant)',
                        }}
                      >
                        <span className="chart-panel-sensor-dot" style={{ background: isVisible ? color : 'var(--outline)', boxShadow: isVisible ? `0 0 5px ${color}` : 'none' }} />
                        <span className="chart-panel-sensor-label" style={{ color: isVisible ? color : 'var(--on-surface-variant)' }}>
                          {k === 'temp' ? 'T°' : 'HR%'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="chart-panel-canvas-wrap">
                <canvas ref={canvas1Ref} className="chart-panel-canvas" />
              </div>
            </div>
            <div className="chart-panel-pane">
              <div className="chart-panel-bar-header">
                <span className="chart-panel-bar-label">ECO₂ & TVOC</span>
                <div className="flex gap-2">
                  {['eco2', 'tvoc'].map(k => {
                    const isVisible = visibleLines[k]
                    const color = timeColors[k]
                    return (
                      <button
                        key={k}
                        onClick={() => setVisibleLines(prev => ({ ...prev, [k]: !prev[k] }))}
                        className="chart-panel-sensor-btn"
                        style={{
                          opacity: isVisible ? 1 : 0.35,
                          background: isVisible ? `${color}08` : 'transparent',
                          borderColor: isVisible ? `${color}40` : 'var(--outline-variant)',
                        }}
                      >
                        <span className="chart-panel-sensor-dot" style={{ background: isVisible ? color : 'var(--outline)', boxShadow: isVisible ? `0 0 5px ${color}` : 'none' }} />
                        <span className="chart-panel-sensor-label" style={{ color: isVisible ? color : 'var(--on-surface-variant)' }}>
                          {k === 'eco2' ? 'eCO₂' : 'TVOC'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="chart-panel-canvas-wrap">
                <canvas ref={canvas2Ref} className="chart-panel-canvas" />
              </div>
            </div>
          </div>
          <div className="chart-panel-footer">
            {[
              { id: 't', c: timeColors.temp, lbl: `Temp ${has.temp ? telemetry.temperature.toFixed(1) : '--'} °C`, visible: visibleLines.temp },
              { id: 'h', c: timeColors.hum, lbl: `Hum ${has.hum ? telemetry.humidity.toFixed(1) : '--'} %RH`, visible: visibleLines.hum },
              { id: 'e', c: timeColors.eco2, lbl: `eCO₂ ${has.eco2 ? Math.round(telemetry.co2) : '--'} ppm`, visible: visibleLines.eco2 },
              { id: 'v', c: timeColors.tvoc, lbl: `TVOC ${has.tvoc ? Math.round(telemetry.voc) : '--'} ppb`, visible: visibleLines.tvoc },
            ].map(item => (
              <div key={item.id} className="chart-panel-legend-item" style={{ opacity: item.visible ? 1 : 0.35, transition: 'all 0.2s' }}>
                <span className="chart-panel-legend-line" style={{ background: item.visible ? item.c : 'var(--outline)' }} />
                <span className="chart-panel-legend-label">{item.lbl}</span>
              </div>
            ))}
            <div className="chart-panel-legend-item">
              <span className="chart-panel-optimal" />
              <span className="chart-panel-legend-label">optimal</span>
            </div>
            {loading && <span className="chart-panel-loading">loading...</span>}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ChartPanel
