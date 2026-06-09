import { useState, useEffect } from 'react'
import type { SimState } from '../../types'

const STATE_LABEL: Partial<Record<SimState, string>> = {
  idle: 'System Ready', missed_call: 'Missed Call Detected',
  initiating_callback: 'Initiating Callback', dialing: 'Dialing Patient',
  connected: 'Patient Connected', identifying_reason: 'Collecting Reason',
  booking_in_progress: 'Booking Appointment', confirmed: 'Appointment Confirmed',
  complete: 'Complete',
}

const STATE_COLOR: Partial<Record<SimState, string>> = {
  idle: 'text-sx-muted', missed_call: 'text-amber-400',
  initiating_callback: 'text-sx-blue', dialing: 'text-sx-blue',
  connected: 'text-green-400', identifying_reason: 'text-green-400',
  booking_in_progress: 'text-sx-blue', confirmed: 'text-green-400', complete: 'text-green-400',
}

function useElapsed(startedAt: number | null) {
  const [e, setE] = useState(0)
  useEffect(() => {
    if (!startedAt) { setE(0); return }
    const t = setInterval(() => setE(Math.floor((Date.now() - startedAt) / 1000)), 250)
    return () => clearInterval(t)
  }, [startedAt])
  return e
}

export default function LivePanel({ state, label, isRunning, speed, startedAt, onSpeedChange, onSimulate }: {
  state: SimState; label: string; isRunning: boolean; speed: number
  startedAt: number | null; onSpeedChange: (s: number) => void; onSimulate: () => void
}) {
  const elapsed = useElapsed(startedAt)
  const isActive   = state !== 'idle'
  const isComplete = state === 'complete'
  const stateColor = STATE_COLOR[state] ?? 'text-sx-muted'

  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-sx-border flex items-center justify-between">
        <div>
          <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Module 01</p>
          <h3 className="text-sm font-semibold text-white mt-0.5">Live System</h3>
        </div>
        {startedAt && (
          <span className="font-mono text-[11px] text-sx-muted">
            {String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Status indicator */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-sx-dark border border-sx-border">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isActive && !isComplete ? 'bg-sx-blue animate-pulse' :
            isComplete ? 'bg-green-400' : 'bg-sx-border'
          }`} />
          <div className="min-w-0">
            <p className={`text-xs font-semibold truncate ${stateColor}`}>
              {STATE_LABEL[state] ?? 'System Ready'}
            </p>
            {label && state !== 'idle' && (
              <p className="text-[10px] text-sx-muted truncate mt-0.5">{label}</p>
            )}
          </div>
        </div>

        {/* Speed selector */}
        <div>
          <p className="text-[9px] text-sx-muted uppercase tracking-wider mb-1.5">Simulation Speed</p>
          <div className="flex gap-1">
            {[0.5, 1, 2].map(s => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                disabled={isRunning}
                className={`flex-1 py-1 rounded text-[11px] font-semibold transition-all ${
                  speed === s
                    ? 'bg-sx-blue text-white'
                    : 'bg-sx-dark border border-sx-border text-sx-muted hover:text-white disabled:opacity-40'
                }`}
              >{s}×</button>
            ))}
          </div>
        </div>

        {/* Trigger button */}
        <button
          onClick={onSimulate}
          disabled={isRunning}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            isRunning
              ? 'bg-sx-blue/20 text-sx-blue/60 cursor-not-allowed'
              : isComplete
              ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/20'
              : 'bg-sx-blue hover:bg-sx-blue/90 text-white'
          }`}
        >
          {isRunning ? (
            <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Running...</>
          ) : isComplete ? (
            <>✓ Run Again</>
          ) : (
            <><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>Simulate Missed Call</>
          )}
        </button>

        <p className="text-[9px] text-sx-muted text-center">
          Or call <span className="text-white font-mono">+1 647 361 1354</span> to trigger live
        </p>
      </div>
    </div>
  )
}