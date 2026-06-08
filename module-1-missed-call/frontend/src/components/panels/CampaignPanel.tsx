import React from 'react'
import type { SimState, CampaignPatient } from '../../types'

const STATUS_CONFIG = {
  pending:   { dot: 'bg-sx-border',   text: 'text-sx-muted',  label: 'Pending'   },
  calling:   { dot: 'bg-sx-blue animate-pulse', text: 'text-sx-blue',  label: 'Calling...' },
  booked:    { dot: 'bg-green-400',   text: 'text-green-400', label: 'Booked ✓'  },
  voicemail: { dot: 'bg-amber-400',   text: 'text-amber-400', label: 'Voicemail' },
  no_answer: { dot: 'bg-sx-muted',    text: 'text-sx-muted',  label: 'No Answer' },
}

function StatCard({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className={`flex-1 rounded-lg px-3 py-2.5 border ${accent ? 'bg-sx-blue/10 border-sx-blue/20' : 'bg-sx-dark border-sx-border'}`}>
      <p className={`text-lg font-bold ${accent ? 'text-sx-blue' : 'text-white'}`}>{value}</p>
      <p className="text-[10px] text-sx-muted mt-0.5">{label}</p>
    </div>
  )
}

export default function CampaignPanel({ patients, revenue, state }: {
  patients: CampaignPatient[]
  revenue: number
  state: SimState
}) {
  const isActive = state !== 'idle'
  const booked = patients.filter(p => p.status === 'booked').length
  const contacted = patients.filter(p => p.status !== 'pending').length
  const isComplete = state === 'complete'

  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-sx-border flex-shrink-0">
        <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Campaign View</p>
        <h2 className="text-sm font-semibold text-white mt-0.5">Reactivation Queue</h2>
      </div>

      {/* Stats row */}
      {isActive && (
        <div className="flex gap-2 px-4 py-3 border-b border-sx-border flex-shrink-0 animate-fade-in-up">
          <StatCard value={String(contacted)} label="Contacted" />
          <StatCard value={String(booked)} label="Booked" />
          <StatCard value={`$${revenue.toLocaleString()}`} label="Recovered" accent />
        </div>
      )}

      {/* Patient list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-2 min-h-0">
        {!isActive ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-sx-muted text-center">
              Patient list will appear<br />when the campaign starts.
            </p>
          </div>
        ) : (
          patients.map(p => {
            const cfg = STATUS_CONFIG[p.status]
            return (
              <div key={p.id}
                className={`rounded-lg border px-4 py-3 transition-all duration-300 animate-fade-in-up
                  ${p.status === 'calling' ? 'border-sx-blue/30 bg-sx-blue/5' : ''}
                  ${p.status === 'booked'  ? 'border-green-500/20 bg-green-500/5' : ''}
                  ${p.status === 'pending' || p.status === 'voicemail' || p.status === 'no_answer' ? 'border-sx-border bg-sx-dark' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-sx-muted">{p.lastVisit}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold flex-shrink-0 ml-2 ${cfg.text}`}>
                    {cfg.label}
                  </span>
                </div>
                {p.booking && (
                  <p className="text-[10px] text-green-400 mt-2 pl-4 border-l border-green-500/30">
                    {p.booking}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Campaign complete summary */}
      {isComplete && (
        <div className="px-4 py-3 border-t border-sx-border bg-sx-blue/5 flex-shrink-0 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-sx-blue" />
            <p className="text-[10px] font-semibold text-sx-blue">
              Campaign complete — ${revenue.toLocaleString()} est. recovered
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
