import React from 'react'
import type { SimState } from '../../types'

const STAGES: SimState[] = ['claim_flagged', 'reviewing_claim', 'drafting', 'sending_followup', 'response_received', 'status_updated', 'complete']

const CLAIM = {
  id: 'CLM-2026-00847',
  payer: 'WSIB Ontario',
  amount: '$340.00',
  submitted: 'March 26, 2026',
  outstanding: '47 days',
  patient: 'Tom Carvalho',
  provider: 'Dr. Anand Mehta',
  service: 'Physiotherapy — 3 sessions',
  status: 'Pending Review',
}

const LETTER_PREVIEW = `Re: Claim CLM-2026-00847 — Payment Follow-up

Dear WSIB Claims Department,

We are following up on the above-referenced claim submitted March 26, 2026 for physiotherapy services rendered to patient Tom Carvalho.

As of today, 47 days have elapsed without payment or written correspondence. We kindly request confirmation of claim status and an estimated payment timeline.

Clinical documentation and session notes are attached for reference.

Sincerely,
Northview Medical Centre — Billing Department`

const INSURER_RESPONSE = `Thank you for your follow-up. Claim CLM-2026-00847 has been reviewed and approved for payment. Expected remittance: within 5–7 business days.`

export default function InsurancePanel({ state }: { state: SimState }) {
  const activeIdx = STAGES.indexOf(state)
  const hasClaim = activeIdx >= 0 && state !== 'idle'
  const reviewing = activeIdx >= STAGES.indexOf('reviewing_claim')
  const drafting = activeIdx >= STAGES.indexOf('drafting')
  const sent = activeIdx >= STAGES.indexOf('sending_followup')
  const responded = activeIdx >= STAGES.indexOf('response_received')
  const updated = activeIdx >= STAGES.indexOf('status_updated') || state === 'complete'

  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-sx-border flex-shrink-0">
        <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Module 07</p>
        <h2 className="text-sm font-semibold text-white mt-0.5">Insurance Follow-up</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4 min-h-0">

        {/* Claim card */}
        <div className={`rounded-lg border p-3 transition-all duration-500 ${hasClaim ? 'border-sx-border bg-sx-surface' : 'border-sx-border/40 bg-sx-surface/40'}`}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className={`text-xs font-semibold font-mono transition-colors ${hasClaim ? 'text-white' : 'text-sx-muted'}`}>{CLAIM.id}</p>
              <p className="text-[10px] text-sx-muted">{CLAIM.payer}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-sm font-bold transition-colors ${updated ? 'text-green-400' : hasClaim ? 'text-sx-blue' : 'text-sx-muted'}`}>{CLAIM.amount}</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all duration-300 ${
                updated
                  ? 'bg-green-500/15 text-green-400 border-green-500/20'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
              }`}>
                {updated ? 'APPROVED' : 'PENDING'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {[
              { label: 'Patient', value: CLAIM.patient },
              { label: 'Provider', value: CLAIM.provider },
              { label: 'Service', value: CLAIM.service },
              { label: 'Outstanding', value: CLAIM.outstanding },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[9px] text-sx-border uppercase tracking-wide">{label}</p>
                <p className={`text-[10px] transition-colors ${hasClaim ? 'text-sx-muted' : 'text-sx-border'}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status timeline */}
        <div className="space-y-2">
          <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Follow-up Timeline</p>
          {[
            { label: 'Claim flagged as overdue',   done: hasClaim,   active: state === 'claim_flagged'   },
            { label: 'Reviewing claim history',    done: reviewing,  active: state === 'reviewing_claim'  },
            { label: 'Drafting follow-up letter',  done: drafting,   active: state === 'drafting'         },
            { label: 'Letter sent to insurer',     done: sent,       active: state === 'sending_followup' },
            { label: 'Insurer responded',          done: responded,  active: state === 'response_received'},
            { label: 'Claim status updated',       done: updated,    active: state === 'status_updated'   },
          ].map(({ label, done, active }) => (
            <div key={label} className="flex items-center gap-3 pl-1">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                done ? 'bg-sx-blue' : active ? 'bg-sx-blue/40 ring-2 ring-sx-blue animate-pulse' : 'bg-sx-border'
              }`}>
                {done && (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <span className={`text-[10px] transition-colors ${done ? 'text-white' : active ? 'text-sx-blue' : 'text-sx-muted'}`}>{label}</span>
            </div>
          ))}
        </div>

        {/* Letter preview */}
        {drafting && (
          <div className={`rounded-lg border p-3 transition-all duration-500 ${sent ? 'border-sx-border bg-sx-surface' : 'border-sx-border/60 bg-sx-surface/60'}`}>
            <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase mb-2">Follow-up Letter</p>
            <pre className="text-[9px] text-sx-muted leading-relaxed whitespace-pre-wrap font-mono">{LETTER_PREVIEW}</pre>
          </div>
        )}

        {/* Insurer response */}
        {responded && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 space-y-1">
            <p className="text-[9px] font-semibold tracking-widest text-green-400/70 uppercase">Insurer Response</p>
            <p className="text-[10px] text-sx-muted leading-relaxed">{INSURER_RESPONSE}</p>
          </div>
        )}
      </div>
    </div>
  )
}
