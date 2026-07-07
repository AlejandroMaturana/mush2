const root = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null
const CSS_VAR = (name, fallback) => root?.getPropertyValue(name)?.trim() || fallback

const GAUGE_COLORS = {
  blue: CSS_VAR('--gauge-blue', '#3b82f6'),
  green: CSS_VAR('--gauge-green', '#22c55e'),
  red: CSS_VAR('--gauge-red', '#ef4444'),
}

function hexToRgb(h) {
  h = h.replace('#', '')
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]
}

function lerpColor(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2)
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `rgb(${r},${g},${bl})`
}

function clamp01(x) { return Math.max(0, Math.min(1, x)) }

function colorForValue(v, min, max, optMin, optMax) {
  if (v <= optMin) {
    const span = optMin - min
    const t = span > 0 ? clamp01((v - min) / span) : 1
    return lerpColor(GAUGE_COLORS.blue, GAUGE_COLORS.green, t)
  }
  if (v >= optMax) {
    const span = max - optMax
    const t = span > 0 ? clamp01((v - optMax) / span) : 1
    return lerpColor(GAUGE_COLORS.green, GAUGE_COLORS.red, t)
  }
  return GAUGE_COLORS.green
}

function pt(cx, cy, r, deg) {
  const rd = deg * Math.PI / 180
  return [cx + r * Math.cos(rd), cy - r * Math.sin(rd)]
}

function domeD(cx, cy, r) {
  const [, y1] = pt(cx, cy, r, 180)
  const [, y2] = pt(cx, cy, r, 0)
  return `M${cx - r} ${y1} A${r} ${r} 0 0 1 ${cx + r} ${y2}`
}

function arcD(val, min, max, cx, cy, r) {
  const p = Math.max(0, Math.min(1, (val - min) / (max - min)))
  const a1 = 180, a2 = 180 - p * 180
  const [x1, y1] = pt(cx, cy, r, a1)
  const [x2, y2] = pt(cx, cy, r, a2)
  return `M${x1} ${y1} A${r} ${r} 0 ${p > 0.5 ? 1 : 0} 0 ${x2} ${y2}`
}

function DomeGauge({ value, prevValue, min, max, optMin, optMax, unit, label, decimals = 1, history = [], noData }) {
  const cx = 100, cy = 74, r = 60
  const displayVal = noData ? min : value
  const p = Math.max(0, Math.min(1, (displayVal - min) / (max - min)))
  const rot = p * 180 - 90
  const col = noData ? '#2e4036' : colorForValue(value, min, max, optMin, optMax)
  const optMinPct = ((optMin - min) / (max - min) * 100).toFixed(2)
  const optMaxPct = ((optMax - min) / (max - min) * 100).toFixed(2)
  const optBounds = optMinPct < optMaxPct
    ? [{ offset: 0, color: GAUGE_COLORS.blue }, { offset: +optMinPct, color: GAUGE_COLORS.green }, { offset: +optMaxPct, color: GAUGE_COLORS.green }, { offset: 100, color: GAUGE_COLORS.red }]
    : [{ offset: 0, color: GREEN }, { offset: 0, color: GREEN }]

  const delta = !noData && prevValue !== undefined ? value - prevValue : 0
  const dAbs = Math.abs(delta)
  const dStr = dAbs < 0.05 ? '·' : delta > 0 ? '↑' : '↓'
  const dVal = decimals === 0 ? Math.round(dAbs) : dAbs.toFixed(decimals)
  const dCol = dAbs < 0.05 ? '#2e4036' : delta > 0 ? '#4ade80' : '#f87171'

  return (
    <div className="flex flex-col flex-1 min-w-0" style={{ borderTop: `2px solid ${col}55` }}>
      <div style={{ textAlign: 'center', fontSize: '7.5px', color: '#4a6652', letterSpacing: '0.14em', textTransform: 'uppercase', paddingTop: '6px', fontFamily: 'var(--font-mono)' }}>
        {label}
      </div>
      <svg viewBox="0 0 200 110" role="img" style={{ display: 'block', width: '100%' }}>
        <title>{`${label} gauge, optimal range ${optMin} to ${optMax} ${unit}`}</title>
        <defs>
          <linearGradient id={`grad-${label.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
            {optBounds.map((s, i) => (
              <stop key={i} offset={`${s.offset}%`} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>
        <path d={domeD(cx, cy, r)} fill="none" stroke="#141f18" strokeWidth="15" strokeLinecap="butt" />
        <path d={domeD(cx, cy, r)} fill="none" stroke={`url(#grad-${label.replace(/\s/g, '')})`} strokeWidth="15" strokeLinecap="butt" opacity="0.9" />
        {Array.from({ length: 11 }, (_, i) => {
          const a = 180 - i / 10 * 180
          const [ix, iy] = pt(cx, cy, r - 5, a)
          const [ox, oy] = pt(cx, cy, r + 7, a)
          return <line key={i} x1={ix} y1={iy} x2={ox} y2={oy} stroke="rgba(255,255,255,0.18)" strokeWidth={i % 5 === 0 ? '1.8' : '0.9'} />
        })}
        <text x={cx - r - 6} y={pt(cx, cy, r + 4, 180)[1] + 2} fill="#2e4036" fontSize="7" textAnchor="end" fontFamily="var(--font-mono)">{min}</text>
        <text x={cx + r + 6} y={pt(cx, cy, r + 4, 0)[1] + 2} fill="#2e4036" fontSize="7" textAnchor="start" fontFamily="var(--font-mono)">{max}</text>
        <g style={{ transformOrigin: '0 0', transform: `translate(${cx}px, ${cy}px) rotate(${rot}deg)`, transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <line x1="0" y1="5" x2="0" y2={-(r - 7)} stroke="#c8dcd2" strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <circle cx={cx} cy={cy} r="5.5" fill="#09100c" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="3" fill={col} style={{ transition: 'fill 0.5s' }} />
        <text x={cx} y={cy + 21} textAnchor="middle" fontSize="21" fontWeight="500" fontFamily="var(--font-mono)">
          <tspan fill={col} style={{ transition: 'fill 0.5s' }}>{noData ? '--' : (decimals === 0 ? Math.round(value) : value.toFixed(decimals))}</tspan>
          {!noData && <tspan fontSize="9" fill="#2e4036"> {unit}</tspan>}
        </text>
        {!noData && (
          <text x={cx} y={cy + 33} textAnchor="middle" fontSize="8" fill={dCol} fontFamily="var(--font-mono)" style={{ transition: 'fill 0.3s' }}>
            {dStr} {dVal}
          </text>
        )}
      </svg>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: '14px', gap: '2px', padding: '0 10px 6px' }}>
        {Array.from({ length: 12 }, (_, i) => {
          const v = history[i] ?? min
          const pct = Math.max(8, Math.min(100, Math.round((v - min) / (max - min) * 100)))
          const c = colorForValue(v, min, max, optMin, optMax)
          return (
            <div key={i} style={{
              flex: 1,
              borderRadius: '1px 1px 0 0',
              minHeight: '2px',
              height: `${pct}%`,
              background: c,
              opacity: i === history.length - 1 || (i === 11 && history.length >= 12) ? 1 : 0.45,
              transition: 'height 0.35s, background 0.35s',
            }} />
          )
        })}
      </div>
    </div>
  )
}

export default DomeGauge
