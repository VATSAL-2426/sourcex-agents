const OUTCOME_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  booked:              { label: 'Booked',         color: 'bg-emerald-400', bg: 'bg-emerald-400/10' },
  callback_requested:  { label: 'Callback Req.',  color: 'bg-sky-400',     bg: 'bg-sky-400/10'     },
  no_answer:           { label: 'No Answer',      color: 'bg-amber-400',   bg: 'bg-amber-400/10'   },
  voicemail:           { label: 'Voicemail',      color: 'bg-violet-400',  bg: 'bg-violet-400/10'  },
  declined:            { label: 'Declined',       color: 'bg-rose-400',    bg: 'bg-rose-400/10'    },
  inquiry_only:        { label: 'Inquiry',        color: 'bg-blue-400',    bg: 'bg-blue-400/10'    },
  callback_initiated:  { label: 'In Progress',    color: 'bg-sx-blue',     bg: 'bg-sx-blue/10'     },
}

export default function OutcomesPanel({ byOutcome }: { byOutcome: Record<string, number> }) {
  const entries = Object.entries(byOutcome).sort((a, b) => b[1] - a[1])
  const total   = entries.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl overflow-hidden flex-1 shadow-sm">
      <div className="px-4 py-3 border-b border-sx-border">
        <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Call Outcomes</p>
        <h3 className="text-sm font-semibold text-sx-text mt-0.5">Outcome Breakdown</h3>
      </div>

      <div className="p-4">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
            </svg>
            <p className="text-sx-muted text-[11px]">No data yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(([key, count]) => {
              const cfg = OUTCOME_CONFIG[key] ?? { label: key, color: 'bg-sx-muted', bg: 'bg-sx-muted/10' }
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.color}`} />
                      <span className="text-[11px] text-sx-muted">{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-sx-text">{count}</span>
                      <span className="text-[10px] text-sx-muted w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1 bg-sx-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${cfg.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {total > 0 && (
          <div className="mt-3 pt-3 border-t border-sx-border flex items-center justify-between">
            <span className="text-[10px] text-sx-muted">Total calls</span>
            <span className="text-xs font-bold text-sx-text">{total}</span>
          </div>
        )}
      </div>
    </div>
  )
}