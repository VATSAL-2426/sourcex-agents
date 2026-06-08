import React, { useState, useEffect } from 'react'
import type { SimState, ModuleId } from '../../types'
import PulseRing from '../shared/PulseRing'
import SpeedSlider from '../shared/SpeedSlider'

const MODULE_STATES: Record<ModuleId, SimState[]> = {
  1: ['missed_call','initiating_callback','dialing','connected','identifying_reason','booking_in_progress','confirmed','complete'],
  2: ['no_show_detected','reviewing_history','initiating_outreach','dialing','connected','reason_captured','rebooking','rebooked','complete'],
  3: ['campaign_start','contact_1','booked_1','contact_2','voicemail_2','contact_3','booked_3','contact_4','no_answer_4','contact_5','booked_5','complete'],
  4: ['fax_received','scanning','classifying','extracting','routing','notifying','complete'],
  5: ['slot_opened','scanning_waitlist','matching','contacting_match','patient_confirmed','slot_filled','complete'],
  6: ['visit_completed','delay_window','sending_sms','sms_delivered','response_received','review_requested','review_posted','complete'],
  7: ['claim_flagged','reviewing_claim','drafting','sending_followup','response_received','status_updated','complete'],
}

const MODULE_CONFIG: Record<ModuleId, { title: string; button: string; running: string }> = {
  1: { title: 'Missed Call Recovery', button: 'Simulate Missed Call',       running: 'Simulation Running...'   },
  2: { title: 'No-Show Recovery',     button: 'Simulate No-Show',           running: 'Simulation Running...'   },
  3: { title: 'Patient Reactivation', button: 'Run Reactivation Campaign',  running: 'Campaign Running...'     },
  4: { title: 'Fax Automation',       button: 'Simulate Fax Arrival',       running: 'Processing Fax...'       },
  5: { title: 'Waitlist Management',  button: 'Simulate Cancellation',      running: 'Filling Slot...'         },
  6: { title: 'Review Generation',    button: 'Simulate Post-Visit',        running: 'Sending Follow-up...'    },
  7: { title: 'Insurance Follow-up',  button: 'Simulate Claim Follow-up',   running: 'Following Up...'         },
}

const STATE_DISPLAY: Partial<Record<SimState, string>> = {
  idle: 'System Ready',
  // M1
  missed_call: 'Missed Call', initiating_callback: 'Initiating Callback',
  dialing: 'Dialing', connected: 'Connected', identifying_reason: 'Reason Identified',
  booking_in_progress: 'Booking', confirmed: 'Confirmed',
  // M2
  no_show_detected: 'No-Show Detected', reviewing_history: 'Reviewing History',
  initiating_outreach: 'Outreach Initiated', reason_captured: 'Reason Captured',
  rebooking: 'Rebooking', rebooked: 'Rebooked',
  // M3
  campaign_start: 'Campaign Started', contact_1: 'Contacting 1',
  booked_1: 'Patient 1 Booked', contact_2: 'Contacting 2', voicemail_2: 'Voicemail',
  contact_3: 'Contacting 3', booked_3: 'Patient 3 Booked', contact_4: 'Contacting 4',
  no_answer_4: 'No Answer', contact_5: 'Contacting 5', booked_5: 'Patient 5 Booked',
  // M4
  fax_received: 'Fax Received', scanning: 'Scanning', classifying: 'Classifying',
  extracting: 'Extracting', routing: 'Routing', notifying: 'Notifying',
  // M5
  slot_opened: 'Slot Opened', scanning_waitlist: 'Scanning Waitlist',
  matching: 'Matching', contacting_match: 'Contacting Match',
  patient_confirmed: 'Patient Confirmed', slot_filled: 'Slot Filled',
  // M6
  visit_completed: 'Visit Completed', delay_window: 'Delay Window',
  sending_sms: 'Sending SMS', sms_delivered: 'SMS Delivered',
  response_received: 'Response Received', review_requested: 'Review Requested',
  review_posted: 'Review Posted',
  // M7
  claim_flagged: 'Claim Flagged', reviewing_claim: 'Reviewing Claim',
  drafting: 'Drafting Letter', sending_followup: 'Sending Follow-up',
  status_updated: 'Status Updated',
  // Shared
  complete: 'Complete',
}

const PhoneIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14v2.92z"/>
  </svg>
)
const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const FileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
)
const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const StarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const MODULE_ICONS: Record<ModuleId, React.ComponentType> = {
  1: PhoneIcon, 2: PhoneIcon, 3: UsersIcon,
  4: FileIcon, 5: CalendarIcon, 6: StarIcon, 7: ShieldIcon,
}

function useElapsed(startedAt: number | null) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) { setElapsed(0); return }
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250)
    return () => clearInterval(t)
  }, [startedAt])
  return elapsed
}

export default function LiveStatusPanel({ state, label, isRunning, speed, startedAt, moduleId, onSpeedChange, onSimulate }: {
  state: SimState; label: string; isRunning: boolean; speed: number
  startedAt: number | null; moduleId: ModuleId; onSpeedChange: (s: number) => void; onSimulate: () => void
}) {
  const elapsed = useElapsed(startedAt)
  const allStates = MODULE_STATES[moduleId]
  const idx = allStates.indexOf(state as never)
  const cfg = MODULE_CONFIG[moduleId]
  const Icon = MODULE_ICONS[moduleId]
  const isActive = isRunning || ['confirmed','rebooked','slot_filled','review_posted','notifying','status_updated'].includes(state)
  const isComplete = state === 'complete'
  const displayDots = allStates.slice(0, 9)

  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-sx-border flex-shrink-0">
        <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Module 0{moduleId}</p>
        <h2 className="text-sm font-semibold text-white mt-0.5">{cfg.title}</h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 py-4 min-h-0">
        <PulseRing active={isActive} size={84}><Icon /></PulseRing>

        <div className="text-center px-2">
          <p className={`text-sm font-semibold transition-colors duration-300 ${isComplete ? 'text-sx-blue' : isActive ? 'text-white' : 'text-sx-muted'}`}>
            {STATE_DISPLAY[state] ?? 'System Ready'}
          </p>
          <p className="text-[11px] text-sx-muted mt-1 leading-relaxed">
            {state === 'idle' ? 'Waiting for trigger event' : label}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-[160px]">
          {displayDots.map((s, i) => (
            <div key={`${s}-${i}`} className={`rounded-full transition-all duration-300 ${
              i < idx ? 'w-2 h-2 bg-sx-blue' :
              i === idx && state !== 'idle' ? 'w-2.5 h-2.5 bg-sx-blue animate-pulse' :
              'w-2 h-2 bg-sx-border'
            }`} />
          ))}
          {allStates.length > 9 && <span className="text-[9px] text-sx-muted font-mono">+{allStates.length - 9}</span>}
        </div>

        {startedAt && (
          <div className="font-mono text-xs text-sx-muted">
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      <div className="px-5 pb-5 pt-4 space-y-3 flex-shrink-0 border-t border-sx-border">
        <SpeedSlider speed={speed} onChange={onSpeedChange} disabled={isRunning} />
        <button
          onClick={onSimulate}
          disabled={isRunning}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
            isRunning ? 'bg-sx-blue/30 text-sx-blue/60 cursor-not-allowed' : 'bg-sx-blue hover:bg-sx-blue/90 text-white active:scale-[0.98]'
          }`}
        >
          {isRunning ? (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>{cfg.running}</>
          ) : isComplete ? (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>Run Again</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>{cfg.button}</>
          )}
        </button>
      </div>
    </div>
  )
}
