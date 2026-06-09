import type { ReportData } from '../../hooks/useReports'
import type { CallRecord } from '../../types'

interface Card {
  label: string
  value: string
  sub: string
  icon: string
  gradient: string
  iconBg: string
  trend?: { value: number; positive: boolean }
}

function PhoneIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14v2.92z"/></svg>
}
function CalendarIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function DollarIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
}
function TargetIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
}
function ClockIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function MessageIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
}

const ICONS: Record<string, () => JSX.Element> = {
  phone: PhoneIcon, calendar: CalendarIcon, dollar: DollarIcon,
  target: TargetIcon, clock: ClockIcon, message: MessageIcon,
}

function StatCard({ label, value, sub, icon, gradient, iconBg, trend }: Card) {
  const Icon = ICONS[icon]
  return (
    <div className={`relative overflow-hidden rounded-xl p-5 border border-white/5 ${gradient}`}>
      {/* Background glow */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.06), transparent 60%)' }} />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50 mb-2">{label}</p>
          <p className="text-3xl font-bold text-white tracking-tight leading-none">{value}</p>
          <p className="text-[11px] text-white/50 mt-1.5">{sub}</p>
          {trend !== undefined && (
            <div className={`inline-flex items-center gap-1 mt-2 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              trend.positive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                {trend.positive
                  ? <path d="M18 15l-6-6-6 6"/>
                  : <path d="M6 9l6 6 6-6"/>
                }
              </svg>
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon />
        </div>
      </div>
    </div>
  )
}

export default function StatCards({ report, calls }: {
  report: ReportData | null
  calls: CallRecord[]
}) {
  const s = report?.summary
  const fmtRev = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`
  const fmtDur = (s: number) => s >= 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`
  const liveBookings = calls.filter(c => c.outcome === 'booked' && c.mode === 'live').length

  const cards: Card[] = [
    {
      label:    'Calls Recovered',
      value:    String(s?.totalHandled ?? 0),
      sub:      `Last ${report?.period.days ?? 30} days`,
      icon:     'phone',
      gradient: 'bg-gradient-to-br from-violet-950 via-violet-900/60 to-sx-panel',
      iconBg:   'bg-violet-500/20 text-violet-300',
      trend:    { value: 12, positive: true },
    },
    {
      label:    'Bookings Created',
      value:    String(s?.booked ?? 0),
      sub:      'Confirmed appointments',
      icon:     'calendar',
      gradient: 'bg-gradient-to-br from-teal-950 via-teal-900/60 to-sx-panel',
      iconBg:   'bg-teal-500/20 text-teal-300',
      trend:    { value: 8, positive: true },
    },
    {
      label:    'Revenue Recovered',
      value:    fmtRev(s?.estimatedRevenue ?? 0),
      sub:      `@ $${report?.avgFee ?? 350}/appt est.`,
      icon:     'dollar',
      gradient: 'bg-gradient-to-br from-sky-950 via-sky-900/60 to-sx-panel',
      iconBg:   'bg-sky-500/20 text-sky-300',
      trend:    { value: 18, positive: true },
    },
    {
      label:    'Success Rate',
      value:    `${s?.successRate ?? 0}%`,
      sub:      'Calls converted to bookings',
      icon:     'target',
      gradient: 'bg-gradient-to-br from-emerald-950 via-emerald-900/60 to-sx-panel',
      iconBg:   'bg-emerald-500/20 text-emerald-300',
      trend:    { value: 3, positive: true },
    },
    {
      label:    'Avg Callback Time',
      value:    fmtDur(s?.avgDurationSeconds ?? 0),
      sub:      'Mean call duration',
      icon:     'clock',
      gradient: 'bg-gradient-to-br from-amber-950 via-amber-900/60 to-sx-panel',
      iconBg:   'bg-amber-500/20 text-amber-300',
    },
    {
      label:    'Live Bookings',
      value:    String(liveBookings),
      sub:      'Real calls, not simulations',
      icon:     'message',
      gradient: 'bg-gradient-to-br from-rose-950 via-rose-900/60 to-sx-panel',
      iconBg:   'bg-rose-500/20 text-rose-300',
      trend:    liveBookings > 0 ? { value: 100, positive: true } : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-6 gap-4">
      {cards.map(card => <StatCard key={card.label} {...card} />)}
    </div>
  )
}