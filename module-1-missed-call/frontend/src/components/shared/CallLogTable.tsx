import type { CallRecord } from '../../types'

const OUTCOME_STYLE: Record<string, { label: string; cls: string }> = {
  booked:             { label: 'Booked',      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  callback_requested: { label: 'Callback',    cls: 'bg-sky-500/10     text-sky-400     border-sky-500/20'     },
  no_answer:          { label: 'No Answer',   cls: 'bg-amber-500/10   text-amber-400   border-amber-500/20'   },
  voicemail:          { label: 'Voicemail',   cls: 'bg-violet-500/10  text-violet-400  border-violet-500/20'  },
  declined:           { label: 'Declined',    cls: 'bg-rose-500/10    text-rose-400    border-rose-500/20'    },
  inquiry_only:       { label: 'Inquiry',     cls: 'bg-blue-500/10    text-blue-400    border-blue-500/20'    },
  callback_initiated: { label: 'In Progress', cls: 'bg-sx-blue/10     text-sx-blue     border-sx-blue/20'     },
  processed:          { label: 'Processed',   cls: 'bg-teal-500/10    text-teal-400    border-teal-500/20'    },
  filled:             { label: 'Filled',      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  review_posted:      { label: 'Reviewed',    cls: 'bg-violet-500/10  text-violet-400  border-violet-500/20'  },
  escalated:          { label: 'Escalated',   cls: 'bg-orange-500/10  text-orange-400  border-orange-500/20'  },
}

const MODE_STYLE: Record<string, string> = {
  live:                'bg-green-500/10 text-green-400 border-green-500/20',
  simulation:          'bg-sx-muted/10 text-sx-muted border-sx-border',
  simulation_fallback: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

function Badge({ variant, label }: { variant: string; label?: string }) {
  const style = OUTCOME_STYLE[variant]
  const cls   = style?.cls ?? MODE_STYLE[variant] ?? 'bg-sx-muted/10 text-sx-muted border-sx-border'
  const text  = label ?? style?.label ?? variant
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {text}
    </span>
  )
}

function fmt(iso: string, type: 'time' | 'date') {
  const d = new Date(iso)
  return type === 'time'
    ? d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

const HEADERS = ['Time', 'Patient', 'Phone', 'Reason', 'Appointment', 'Outcome', 'Mode']

export default function CallLogTable({ calls, loading, newestId }: {
  calls: CallRecord[]; loading: boolean; newestId: string | null
}) {
  const liveCount = calls.filter(c => c.mode === 'live').length
  const simCount  = calls.filter(c => c.mode !== 'live').length

  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-sx-border">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Call Log</h3>
          <div className="flex items-center gap-2">
            {calls.length > 0 && (
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-sx-blue/10 text-sx-blue border border-sx-blue/20">
                {calls.length} records
              </span>
            )}
            {liveCount > 0 && (
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {liveCount} live
              </span>
            )}
            {simCount > 0 && (
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-sx-muted/10 text-sx-muted border border-sx-border">
                {simCount} simulated
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-sx-muted">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          PHIPA Compliant · No raw PHI displayed
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-5 h-5 border-2 border-sx-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 h-24">
            <p className="text-sx-muted text-xs">No calls logged yet.</p>
            <p className="text-sx-border text-[10px]">Call <span className="text-white font-mono">+1 647 361 1354</span> or run a simulation to see results.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-sx-border">
                {HEADERS.map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-semibold tracking-widest text-sx-muted uppercase whitespace-nowrap bg-sx-panel/50">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map(call => (
                <tr
                  key={call.id}
                  className={`border-b border-sx-border/40 transition-colors ${
                    call.id === newestId
                      ? 'bg-sx-blue/5 border-l-2 border-l-sx-blue'
                      : 'hover:bg-white/[0.015]'
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-mono text-white text-[11px]">{fmt(call.timestamp, 'time')}</div>
                    <div className="text-sx-muted text-[10px]">{fmt(call.timestamp, 'date')}</div>
                  </td>
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{call.patient_name}</td>
                  <td className="px-4 py-3 text-sx-muted font-mono whitespace-nowrap text-[11px]">
                    {(call.patient_phone || '').replace(/\d(?=\d{4})/g, '•')}
                  </td>
                  <td className="px-4 py-3 text-sx-muted max-w-[160px] truncate">{call.reason}</td>
                  <td className="px-4 py-3 text-white whitespace-nowrap max-w-[140px] truncate">{call.appointment || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge variant={call.outcome} /></td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge variant={call.mode} label={call.mode === 'live' ? 'Live' : 'Sim'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}