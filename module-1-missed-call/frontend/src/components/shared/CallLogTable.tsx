import React from 'react'
import type { CallRecord } from '../../types'
import StatusBadge from './StatusBadge'

function fmt(iso: string, type: 'time'|'date') {
  const d = new Date(iso)
  return type === 'time'
    ? d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export default function CallLogTable({ calls, loading, newestId }: { calls: CallRecord[]; loading: boolean; newestId: string|null }) {
  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-sx-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Call Log</h3>
          {calls.length > 0 && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-sx-blue/10 text-sx-blue border border-sx-blue/20">{calls.length} records</span>}
        </div>
        <p className="text-[9px] text-sx-muted font-mono">Local JSON store</p>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-sx-blue border-t-transparent rounded-full animate-spin" /></div>
        ) : calls.length === 0 ? (
          <div className="flex items-center justify-center h-full"><p className="text-sx-muted text-xs">No calls logged yet. Run a simulation to see results here.</p></div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-sx-panel">
              <tr className="text-left border-b border-sx-border">
                {['Time','Patient','Phone','Reason','Outcome','Appointment','Mode'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-semibold tracking-wider text-sx-muted uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map(call => (
                <tr key={call.id} className={`border-b border-sx-border/50 transition-colors ${call.id === newestId ? 'bg-sx-blue/5 border-l-2 border-l-sx-blue' : 'hover:bg-white/[0.02]'}`}>
                  <td className="px-4 py-2.5 whitespace-nowrap"><div className="font-mono text-white">{fmt(call.timestamp,'time')}</div><div className="text-sx-muted">{fmt(call.timestamp,'date')}</div></td>
                  <td className="px-4 py-2.5 text-white font-medium whitespace-nowrap">{call.patient_name}</td>
                  <td className="px-4 py-2.5 text-sx-muted font-mono whitespace-nowrap">{call.patient_phone}</td>
                  <td className="px-4 py-2.5 text-sx-muted max-w-[140px] truncate">{call.reason}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><StatusBadge variant={call.outcome} /></td>
                  <td className="px-4 py-2.5 text-white whitespace-nowrap">{call.appointment}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><StatusBadge variant={call.mode} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
