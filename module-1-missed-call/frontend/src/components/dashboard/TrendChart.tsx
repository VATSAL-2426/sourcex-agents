import type { TrendPoint } from '../../hooks/useReports'

const W = 700, H = 200
const PAD = { top: 16, right: 24, bottom: 36, left: 36 }
const IW = W - PAD.left - PAD.right
const IH = H - PAD.top - PAD.bottom

function toPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}

function toArea(points: { x: number; y: number }[], baseline: number) {
  if (points.length < 2) return ''
  const line = toPath(points)
  const last = points[points.length - 1]
  const first = points[0]
  return `${line} L ${last.x.toFixed(1)} ${baseline.toFixed(1)} L ${first.x.toFixed(1)} ${baseline.toFixed(1)} Z`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export default function TrendChart({ trend, period }: { trend: TrendPoint[]; period: number }) {
  const hasData = trend.length >= 2

  const maxVal = hasData
    ? Math.max(...trend.flatMap(p => [p.handled, p.booked]), 1)
    : 10

  const gridY  = [0, 0.25, 0.5, 0.75, 1]
  const gridMax = Math.ceil(maxVal / 5) * 5

  const px = (i: number) => PAD.left + (i / Math.max(trend.length - 1, 1)) * IW
  const py = (v: number) => PAD.top + IH - (v / gridMax) * IH

  const handledPts = trend.map((p, i) => ({ x: px(i), y: py(p.handled) }))
  const bookedPts  = trend.map((p, i) => ({ x: px(i), y: py(p.booked)  }))
  const baseline   = PAD.top + IH

  // Pick label indices that won't overlap (max ~7 labels)
  const step = Math.max(1, Math.ceil(trend.length / 7))
  const labelIdxs = trend.reduce<number[]>((acc, _, i) => {
    if (i % step === 0 || i === trend.length - 1) acc.push(i)
    return acc
  }, [])

  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-sx-border">
        <div>
          <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Call Recovery Trend</p>
          <h3 className="text-sm font-semibold text-white mt-0.5">Calls &amp; Bookings Over Time</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-sx-blue rounded-full" />
            <span className="text-[10px] text-sx-muted">Calls Recovered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-emerald-400 rounded-full" />
            <span className="text-[10px] text-sx-muted">Bookings</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 py-3">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/>
            </svg>
            <p className="text-sx-muted text-xs">No trend data yet for this period</p>
            <p className="text-sx-border text-[10px]">Run a simulation or trigger a real call to see data here</p>
          </div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
            <defs>
              <linearGradient id="grad-handled" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="grad-booked" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines + Y labels */}
            {gridY.map(v => {
              const yPos = PAD.top + IH * (1 - v)
              const val  = Math.round(gridMax * v)
              return (
                <g key={v}>
                  <line x1={PAD.left} y1={yPos} x2={PAD.left + IW} y2={yPos}
                    stroke="#1E293B" strokeWidth="1" strokeDasharray={v === 0 ? '0' : '4 4'} />
                  <text x={PAD.left - 6} y={yPos + 4} textAnchor="end" fill="#64748B" fontSize="9">{val}</text>
                </g>
              )
            })}

            {/* Area fills */}
            <path d={toArea(handledPts, baseline)} fill="url(#grad-handled)" />
            <path d={toArea(bookedPts,  baseline)} fill="url(#grad-booked)"  />

            {/* Lines */}
            <path d={toPath(handledPts)} fill="none" stroke="#0EA5E9" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
            <path d={toPath(bookedPts)} fill="none" stroke="#34D399" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />

            {/* Dots */}
            {trend.map((p, i) => (
              <g key={i}>
                <circle cx={px(i)} cy={py(p.handled)} r="3.5" fill="#0A0F1E" stroke="#0EA5E9" strokeWidth="2" />
                <circle cx={px(i)} cy={py(p.booked)}  r="3.5" fill="#0A0F1E" stroke="#34D399" strokeWidth="2" />
              </g>
            ))}

            {/* X axis labels */}
            {labelIdxs.map(i => (
              <text key={i} x={px(i)} y={H - 8} textAnchor="middle" fill="#64748B" fontSize="9">
                {formatDate(trend[i].date)}
              </text>
            ))}
          </svg>
        )}
      </div>
    </div>
  )
}