import React, { useState } from 'react'
import type { SimState, Patient, TranscriptLine, ModuleId } from '../../types'

const SHOW_STATES_M1: SimState[] = ['missed_call','initiating_callback','dialing','connected','identifying_reason','booking_in_progress','confirmed','complete']
const SHOW_STATES_M2: SimState[] = ['no_show_detected','reviewing_history','initiating_outreach','dialing','connected','reason_captured','rebooking','rebooked','complete']
const BOOKING_STATES_M1: SimState[] = ['confirmed','complete']
const BOOKING_STATES_M2: SimState[] = ['rebooked','complete']
const TRANSCRIPT_STATES: SimState[] = ['connected','identifying_reason','booking_in_progress','confirmed','complete','reason_captured','rebooking','rebooked']
const CALL_ACTIVE: SimState[] = ['connected','identifying_reason','booking_in_progress','reason_captured','rebooking']

const MODULE_BOOKING: Record<1|2, { label: string; date: string; time: string }> = {
  1: { label: 'Appointment Confirmed', date: 'Friday, May 15 2026', time: '2:30 PM' },
  2: { label: 'Appointment Rebooked',  date: 'Thursday, May 22 2026', time: '2:00 PM' },
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-sx-border/50 last:border-0">
      <span className="text-[10px] text-sx-muted flex-shrink-0 w-24">{label}</span>
      <span className="text-xs text-white text-right">{value}</span>
    </div>
  )
}

export default function PatientRecordPanel({ patient, transcript, state, moduleId }: {
  patient: Patient | null; transcript: TranscriptLine[]; state: SimState; moduleId: 1 | 2
}) {
  const [tab, setTab] = useState<'record' | 'transcript'>('record')

  const showStates = moduleId === 1 ? SHOW_STATES_M1 : SHOW_STATES_M2
  const bookingStates = moduleId === 1 ? BOOKING_STATES_M1 : BOOKING_STATES_M2
  const showContent = showStates.includes(state)
  const showBooking = bookingStates.includes(state)
  const showTranscriptTab = TRANSCRIPT_STATES.includes(state)
  const isCallActive = CALL_ACTIVE.includes(state)
  const booking = MODULE_BOOKING[moduleId]

  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-sx-border flex-shrink-0">
        <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Patient File</p>
        <h2 className="text-sm font-semibold text-white mt-0.5">
          {showContent && patient ? patient.name : 'No Active Patient'}
        </h2>
      </div>

      {showTranscriptTab && (
        <div className="flex border-b border-sx-border flex-shrink-0">
          {(['record', 'transcript'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${tab === t ? 'text-sx-blue border-b-2 border-sx-blue -mb-px bg-sx-blue/5' : 'text-sx-muted hover:text-white'}`}>
              {t === 'record' ? 'Patient Record' : 'Live Transcript'}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 min-h-0">
        {!showContent ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-sx-muted text-center">Patient record will appear<br />when a call is detected.</p>
          </div>
        ) : tab === 'record' ? (
          <div className="space-y-0 animate-fade-in-up">
            <Field label="Full Name"     value={patient?.name ?? '—'} />
            <Field label="Date of Birth" value={patient?.dob ?? '—'} />
            <Field label="Phone"         value={patient?.phone ?? '—'} />
            <Field label="Last Visit"    value={patient?.lastVisit ?? '—'} />
            <Field label="Reason"        value={patient?.reason ?? '—'} />
            <Field label="Provider"      value={patient?.provider ?? '—'} />

            {showBooking && (
              <div className="mt-4 pt-3 border-t border-sx-border animate-fade-in-up">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <p className="text-[9px] font-semibold tracking-widest text-green-400 uppercase">{booking.label}</p>
                </div>
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg px-4 py-3">
                  <Field label="Provider" value={patient?.provider ?? '—'} />
                  <Field label="Date"     value={booking.date} />
                  <Field label="Time"     value={booking.time} />
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[10px] text-sx-muted">Status</span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />CONFIRMED
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {transcript.length === 0 && (
              <p className="text-xs text-sx-muted text-center py-4">Connecting to call...</p>
            )}
            {transcript.map((line, i) => (
              <div key={i} className={`flex transcript-bubble ${line.speaker === 'Agent' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 ${line.speaker === 'Agent' ? 'bg-sx-navy rounded-tl-none' : 'bg-sx-blue/15 border border-sx-blue/20 rounded-tr-none'}`}>
                  <p className={`text-[9px] font-semibold mb-1 ${line.speaker === 'Agent' ? 'text-sx-blue' : 'text-sx-muted'}`}>
                    {line.speaker === 'Agent' ? 'Maya · AI Agent' : patient?.name ?? 'Patient'}
                  </p>
                  <p className="text-xs text-white leading-relaxed">{line.text}</p>
                </div>
              </div>
            ))}
            {isCallActive && transcript.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-sx-navy rounded-xl rounded-tl-none px-3 py-2">
                  <span className="text-sx-blue text-sm cursor-blink">|</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
