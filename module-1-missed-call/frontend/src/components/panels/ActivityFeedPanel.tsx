import React, { useRef, useEffect } from 'react'
import type { ActivityEntry, StateColor } from '../../types'

const DOT: Record<StateColor, string> = { muted:'bg-sx-muted', amber:'bg-amber-400', blue:'bg-sx-blue', green:'bg-green-400', accent:'bg-sx-blue' }
const TEXT: Record<StateColor, string> = { muted:'text-sx-muted', amber:'text-amber-400', blue:'text-sx-blue', green:'text-green-400', accent:'text-sx-blue' }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false })
}

export default function ActivityFeedPanel({ activity }: { activity: ActivityEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [activity.length])

  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-sx-border flex-shrink-0 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Live Feed</p>
          <h2 className="text-sm font-semibold text-white mt-0.5">Activity Log</h2>
        </div>
        {activity.length > 0 && <span className="text-[10px] font-mono text-sx-muted">{activity.length} events</span>}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-1 min-h-0">
        {activity.length === 0 ? (
          <div className="flex items-center gap-2 py-2 opacity-40">
            <div className="w-1.5 h-1.5 rounded-full bg-sx-muted flex-shrink-0" />
            <span className="text-xs text-sx-muted font-mono">Waiting for trigger event...</span>
          </div>
        ) : (
          activity.map(entry => (
            <div key={entry.id} className="flex items-start gap-2.5 py-1.5 animate-fade-in-up">
              <span className="font-mono text-[10px] text-sx-muted flex-shrink-0 mt-0.5 w-20">{fmtTime(entry.timestamp)}</span>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${DOT[entry.color]}`} />
              <span className={`text-xs leading-relaxed ${TEXT[entry.color]}`}>{entry.label}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
