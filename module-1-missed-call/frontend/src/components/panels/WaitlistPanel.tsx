import React from 'react'
import type { SimState } from '../../types'

const STAGES: SimState[] = ['slot_opened', 'scanning_waitlist', 'matching', 'contacting_match', 'patient_confirmed', 'slot_filled', 'complete']

interface WaitlistEntry {
  name: string
  phone: string
  wait: string
  match: boolean
}

const WAITLIST: WaitlistEntry[] = [
  { name: 'Kevin Tran',        phone: '+1 (647) 555-0182', wait: '3 days',  match: true  },
  { name: 'Priya Sharma',      phone: '+1 (416) 555-0247', wait: '5 days',  match: false },
  { name: 'Daniel Fontaine',   phone: '+1 (905) 555-0311', wait: '6 days',  match: false },
  { name: 'Amara Osei',        phone: '+1 (647) 555-0093', wait: '8 days',  match: false },
  { name: 'Susan Kowalski',    phone: '+1 (416) 555-0178', wait: '9 days',  match: false },
  { name: 'Liam Nguyen',       phone: '+1 (905) 555-0462', wait: '11 days', match: false },
  { name: 'Fatima Al-Hassan',  phone: '+1 (647) 555-0529', wait: '14 days', match: false },
  { name: 'Robert Stein',      phone: '+1 (416) 555-0631', wait: '15 days', match: false },
]

const SLOT = {
  date: 'Thursday May 14, 2026',
  time: '11:00 AM',
  provider: 'Dr. Anand Mehta',
  type: 'Physiotherapy — 45 min',
}

export default function WaitlistPanel({ state }: { state: SimState }) {
  const activeIdx = STAGES.indexOf(state)
  const scanning = activeIdx >= STAGES.indexOf('scanning_waitlist')
  const matching = activeIdx >= STAGES.indexOf('matching')
  const contacting = activeIdx >= STAGES.indexOf('contacting_match')
  const confirmed = activeIdx >= STAGES.indexOf('patient_confirmed')
  const filled = activeIdx >= STAGES.indexOf('slot_filled') || state === 'complete'

  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-sx-border flex-shrink-0">
        <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Module 05</p>
        <h2 className="text-sm font-semibold text-white mt-0.5">Waitlist Management</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4 min-h-0">

        {/* Cancelled slot */}
        <div className={`rounded-lg border p-3 transition-all duration-500 ${activeIdx >= 0 && state !== 'idle' ? 'border-sx-border bg-sx-surface' : 'border-sx-border/40 bg-sx-surface/40'}`}>
          <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase mb-2">Cancelled Slot</p>
          <p className="text-xs font-medium text-white">{SLOT.date}</p>
          <p className="text-[10px] text-sx-muted">{SLOT.time} · {SLOT.provider}</p>
          <p className="text-[10px] text-sx-muted">{SLOT.type}</p>
        </div>

        {/* Waitlist */}
        <div>
          <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase mb-2">
            Waitlist Queue
            {scanning && <span className="ml-2 text-sx-blue normal-case tracking-normal font-normal">— scanning {WAITLIST.length} patients</span>}
          </p>
          <div className="space-y-1">
            {WAITLIST.map((entry, i) => {
              const isMatch = entry.match && matching
              const isContacting = entry.match && contacting
              const isConfirmed = entry.match && confirmed
              const isFilled = entry.match && filled
              return (
                <div
                  key={entry.name}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-300 ${
                    isFilled
                      ? 'border-green-500/20 bg-green-500/5'
                      : isContacting
                      ? 'border-sx-blue/30 bg-sx-blue/5'
                      : isMatch
                      ? 'border-sx-blue/20 bg-sx-blue/5'
                      : scanning
                      ? 'border-sx-border/60 bg-sx-surface/60'
                      : 'border-sx-border/30 bg-sx-surface/30'
                  }`}
                >
                  <span className={`text-[10px] font-mono w-4 flex-shrink-0 ${scanning ? 'text-sx-muted' : 'text-sx-border'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-medium truncate transition-colors ${isFilled ? 'text-green-400' : isContacting ? 'text-sx-blue' : scanning ? 'text-white' : 'text-sx-muted'}`}>
                      {entry.name}
                    </p>
                    <p className={`text-[9px] font-mono transition-colors ${scanning ? 'text-sx-muted' : 'text-sx-border'}`}>{entry.phone}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isFilled ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-green-500/15 text-green-400 border border-green-500/20">CONFIRMED</span>
                    ) : isContacting ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sx-blue/15 text-sx-blue border border-sx-blue/20 animate-pulse">CALLING</span>
                    ) : isMatch ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">MATCH</span>
                    ) : (
                      <span className={`text-[9px] font-mono ${scanning ? 'text-sx-muted' : 'text-sx-border'}`}>{entry.wait}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Filled confirmation */}
        {filled && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 space-y-1">
            <p className="text-[9px] font-semibold tracking-widest text-green-400/70 uppercase">Slot Filled</p>
            <p className="text-xs font-semibold text-white">Kevin Tran</p>
            <p className="text-[10px] text-sx-muted">{SLOT.date} · {SLOT.time}</p>
            <p className="text-[10px] text-sx-muted">{SLOT.provider}</p>
          </div>
        )}
      </div>
    </div>
  )
}
