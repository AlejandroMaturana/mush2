import { useRef, useEffect } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

function refBands(bands) {
  return {
    id: 'refBands',
    beforeDraw(chart) {
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

function applyRanges(chart, ranges) {
  if (!chart) return
  for (const [aid, { min, max }] of Object.entries(ranges)) {
    const sc = chart.options.scales[aid]
    if (sc) {
      sc.min = min
      sc.max = max
    }
  }
}

function DeviceHistoryChart({ title, datasets, bands, labels, margin = 0.10 }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) {
      chartRef.current.data.labels = labels
      chartRef.current.data.datasets = datasets
      const ranges = computeRanges(datasets, margin, bands)
      applyRanges(chartRef.current, ranges)
      chartRef.current.update('none')
      return
    }
    const ranges = computeRanges(datasets, margin, bands)
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets },
      plugins: [refBands(bands)],
      options: {
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
            min: ranges.y1?.min ?? 0,
            max: ranges.y1?.max ?? 100,
          },
          y2: {
            grid: { drawOnChartArea: false, drawTicks: false },
            ticks: { color: '#2e4036', font: { family: 'JetBrains Mono, monospace', size: 7 }, maxTicksLimit: 5 },
            border: { color: 'transparent' },
            position: 'right',
            min: ranges.y2?.min ?? 0,
            max: ranges.y2?.max ?? 100,
          },
        },
      },
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current.data.labels = labels
    chartRef.current.data.datasets = datasets
    const ranges = computeRanges(datasets, margin, bands)
    applyRanges(chartRef.current, ranges)
    chartRef.current.update('none')
  }, [labels, datasets, bands, margin])

  return (
    <div style={{ flex: 1, minWidth: 0, padding: '10px 6px 6px' }}>
      <div style={{ fontSize: '7.5px', color: '#4a6652', letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: '4px', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
        {title}
      </div>
      <div style={{ position: 'relative', height: '296px' }}>
        <canvas ref={canvasRef} role="img" aria-label={title} />
      </div>
    </div>
  )
}

export default DeviceHistoryChart
