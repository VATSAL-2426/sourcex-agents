import React from 'react'
import type { SimState } from '../../types'

const STAGES: SimState[] = ['fax_received', 'scanning', 'classifying', 'extracting', 'routing', 'notifying', 'complete']

const FAX_DOC = {
  sender: 'Toronto General Hospital',
  senderFax: '+1 (416) 340-3131',
  pages: 4,
  received: '09:14 AM',
  classification: 'Referral — Physiotherapy',
  patient: 'James Okafor',
  dob: 'July 8, 1978',
  authNumber: 'REF-2026-44821',
  provider: 'Dr. Anand Mehta',
  routing: 'Booking → Physiotherapy Queue',
  notifyTo: 'Front Desk + Dr. Mehta',
}

function StageRow({ label, state, activeState }: { label: string; state: SimState; activeState: SimState }) {
  const idx = STAGES.indexOf(state)
  const activeIdx = STAGES.indexOf(activeState)
  const done = activeIdx > idx || activeState === 'complete'
  const active = activeIdx === idx && activeState !== 'idle'
  return (
    <div className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
        done ? 'bg-sx-blue' : active ? 'bg-sx-blue/40 ring-2 ring-sx-blue animate-pulse' : 'bg-sx-border'
      }`}>
        {done && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>
      <span className={`text-xs transition-colors duration-300 ${done ? 'text-white' : active ? 'text-sx-blue' : 'text-sx-muted'}`}>{label}</span>
    </div>
  )
}

export default function FaxPanel({ state }: { state: SimState }) {
  const activeIdx = STAGES.indexOf(state)
  const hasDoc = activeIdx >= 0 && state !== 'idle'
  const extracted = activeIdx >= STAGES.indexOf('extracting')
  const routed = activeIdx >= STAGES.indexOf('routing')
  const complete = state === 'complete'

  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-sx-border flex-shrink-0">
        <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Module 04</p>
        <h2 className="text-sm font-semibold text-white mt-0.5">Fax Automation</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4 min-h-0">

        {/* Fax document card */}
        <div className={`rounded-lg border p-3 transition-all duration-500 ${hasDoc ? 'border-sx-border bg-sx-surface' : 'border-sx-border/40 bg-sx-surface/40'}`}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className={`text-xs font-semibold transition-colors ${hasDoc ? 'text-white' : 'text-sx-muted'}`}>{FAX_DOC.sender}</p>
              <p className="text-[10px] text-sx-muted font-mono">{FAX_DOC.senderFax}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-[10px] font-mono transition-colors ${hasDoc ? 'text-sx-muted' : 'text-sx-border'}`}>{FAX_DOC.pages} pages</p>
              <p className={`text-[10px] font-mono transition-colors ${hasDoc ? 'text-sx-muted' : 'text-sx-border'}`}>{FAX_DOC.received}</p>
            </div>
          </div>
          <div className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide border transition-all duration-500 ${
            activeIdx >= STAGES.indexOf('classifying')
              ? 'bg-purple-500/15 text-purple-400 border-purple-500/20'
              : 'bg-sx-border/40 text-sx-border border-sx-border/20'
          }`}>
            {activeIdx >= STAGES.indexOf('classifying') ? FAX_DOC.classification : 'Classifying...'}
          </div>
        </div>

        {/* Processing pipeline */}
        <div className="space-y-2">
          <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Processing Pipeline</p>
          <div className="space-y-2 pl-1">
            <StageRow label="Fax received" state="fax_received" activeState={state} />
            <StageRow label="Scanning document" state="scanning" activeState={state} />
            <StageRow label="Classifying content" state="classifying" activeState={state} />
            <StageRow label="Extracting fields" state="extracting" activeState={state} />
            <StageRow label="Routing to team" state="routing" activeState={state} />
            <StageRow label="Notifying staff" state="notifying" activeState={state} />
          </div>
        </div>

        {/* Extracted fields */}
        <div className={`rounded-lg border p-3 space-y-2 transition-all duration-500 ${extracted ? 'border-sx-border bg-sx-surface' : 'border-sx-border/20 bg-sx-surface/20 opacity-50'}`}>
          <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Extracted Fields</p>
          {[
            { label: 'Patient', value: FAX_DOC.patient },
            { label: 'DOB', value: FAX_DOC.dob },
            { label: 'Auth #', value: FAX_DOC.authNumber },
            { label: 'Provider', value: FAX_DOC.provider },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-[10px] text-sx-muted">{label}</span>
              <span className={`text-[10px] font-medium font-mono transition-colors ${extracted ? 'text-white' : 'text-sx-border'}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Routing destination */}
        {routed && (
          <div className="rounded-lg border border-sx-blue/20 bg-sx-blue/5 p-3 space-y-1">
            <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Routing</p>
            <p className="text-xs text-sx-blue">{FAX_DOC.routing}</p>
            {complete && (
              <p className="text-[10px] text-sx-muted">Notified: {FAX_DOC.notifyTo}</p>
            )}
          </div>
        )}

        {complete && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <p className="text-[10px] text-green-400 font-medium">Fax processed and filed successfully</p>
          </div>
        )}
      </div>
    </div>
  )
}
