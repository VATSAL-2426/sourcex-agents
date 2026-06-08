import React from 'react'
import { useReports } from '../../hooks/useReports'

const PERIODS = [{ label: '7d', value: 7 }, { label: '30d', value: 30 }, { label: '90d', value: 90 }]

const MODULE_ORDER = ['1', '2', '3', '4', '5', '6', '7']

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-sx-surface border border-sx-border rounded-xl px-5 py-4 flex flex-col gap-1">
      <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-sx-blue' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-[10px] text-sx-muted">{sub}</p>}
    </div>
  )
}

function Bar({ pct, color = 'bg-sx-blue' }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 h-1.5 bg-sx-border rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

export default function ReportingPanel({ onClose }: { onClose: () => void }) {
  const { data, loading, period, setPeriod, refetch } = useReports()

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`
  const fmtDur = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`

  const maxHandled = data ? Math.max(...Object.values(data.byModule).map(m => m.handled), 1) : 1

  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-sx-border flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">ROI Dashboard</p>
          <h2 className="text-sm font-semibold text-white mt-0.5">{data?.clinic || 'Analytics'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-sx-dark border border-sx-border rounded-lg p-0.5">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${period === p.value ? 'bg-sx-blue text-white' : 'text-sx-muted hover:text-white'}`}
              >{p.label}</button>
            ))}
          </div>
          <button onClick={refetch} className="p-1.5 rounded-lg hover:bg-sx-surface text-sx-muted hover:text-white transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
            </svg>
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sx-surface text-sx-muted hover:text-white transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sx-muted text-xs">Loading report...</div>
        </div>
      ) : !data || data.summary.totalHandled === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="M18.4 9.6a.6.6 0 010 .8l-5 5a.6.6 0 01-.8 0L10 12.8l-3.6 3.6"/>
          </svg>
          <p className="text-sx-muted text-xs">No data yet for this period.</p>
          <p className="text-sx-border text-[10px]">Run a simulation to generate records.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5 min-h-0">

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Handled" value={String(data.summary.totalHandled)} sub={`Last ${period} days`} />
            <StatCard label="Booked" value={String(data.summary.booked)} sub={`${data.summary.successRate}% success rate`} />
            <StatCard label="Revenue Recovered" value={fmt(data.summary.estimatedRevenue)} sub={`@ $${data.avgFee}/appt avg`} accent />
            <StatCard label="Avg Response" value={fmtDur(data.summary.avgDurationSeconds)} sub="per automation" />
          </div>

          {/* Module breakdown */}
          {Object.keys(data.byModule).length > 0 && (
            <div>
              <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase mb-3">By Module</p>
              <div className="space-y-2">
                {MODULE_ORDER
                  .filter(k => data.byModule[k])
                  .map(k => {
                    const m = data.byModule[k]
                    const pct = Math.round((m.handled / maxHandled) * 100)
                    return (
                      <div key={k} className="flex items-center gap-3">
                        <span className="text-[9px] font-mono text-sx-muted w-4 flex-shrink-0">{k.padStart(2, '0')}</span>
                        <span className="text-[10px] text-sx-muted w-36 flex-shrink-0 truncate">{m.label}</span>
                        <Bar pct={pct} />
                        <span className="text-[10px] font-mono text-white w-6 text-right flex-shrink-0">{m.handled}</span>
                        <span className="text-[10px] font-mono text-green-400 w-14 text-right flex-shrink-0">{fmt(m.revenue)}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Outcome breakdown */}
          {Object.keys(data.byOutcome).length > 0 && (
            <div>
              <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase mb-3">Outcomes</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.byOutcome).map(([outcome, count]) => (
                  <div key={outcome} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sx-surface border border-sx-border">
                    <span className="text-[10px] text-sx-muted capitalize">{outcome.replace('_', ' ')}</span>
                    <span className="text-[10px] font-bold text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PHIPA compliance notice */}
          <div className="rounded-lg border border-sx-border/50 bg-sx-surface/50 px-4 py-3 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            <p className="text-[10px] text-sx-muted">Report contains no patient PII — aggregate data only. Compliant with PHIPA reporting requirements.</p>
          </div>
        </div>
      )}
    </div>
  )
}
