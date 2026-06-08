export type ModuleId = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type SimState =
  // Module 1
  | 'idle' | 'missed_call' | 'initiating_callback' | 'dialing' | 'connected'
  | 'identifying_reason' | 'booking_in_progress' | 'confirmed'
  // Module 2
  | 'no_show_detected' | 'reviewing_history' | 'initiating_outreach'
  | 'reason_captured' | 'rebooking' | 'rebooked'
  // Module 3
  | 'campaign_start' | 'contact_1' | 'booked_1' | 'contact_2' | 'voicemail_2'
  | 'contact_3' | 'booked_3' | 'contact_4' | 'no_answer_4' | 'contact_5' | 'booked_5'
  // Module 4
  | 'fax_received' | 'scanning' | 'classifying' | 'extracting' | 'routing' | 'notifying'
  // Module 5
  | 'slot_opened' | 'scanning_waitlist' | 'matching' | 'contacting_match'
  | 'patient_confirmed' | 'slot_filled'
  // Module 6
  | 'visit_completed' | 'delay_window' | 'sending_sms' | 'sms_delivered'
  | 'response_received' | 'review_requested' | 'review_posted'
  // Module 7
  | 'claim_flagged' | 'reviewing_claim' | 'drafting' | 'sending_followup'
  | 'status_updated'
  // Shared
  | 'complete'

export type StateColor = 'muted' | 'amber' | 'blue' | 'green' | 'accent'

export interface SimEvent {
  type: 'init' | 'state_change' | 'transcript_line' | 'campaign_update' | 'complete' | 'error'
  state: SimState
  label: string
  color?: StateColor
  timestamp: string
  speedMultiplier: number
  moduleId?: ModuleId
  patient?: Patient | null
  transcriptLine?: TranscriptLine
  callRecord?: CallRecord
  patients?: CampaignPatient[]
  revenue?: number
}

export interface Patient {
  name: string; phone: string; dob: string
  lastVisit: string; reason: string; provider: string
}

export interface TranscriptLine {
  speaker: 'Agent' | 'Patient'
  text: string
}

export interface ActivityEntry {
  id: string; state: SimState; label: string; color: StateColor; timestamp: string
}

export interface CampaignPatient {
  id: number; name: string; phone: string; lastVisit: string
  status: 'pending' | 'calling' | 'booked' | 'voicemail' | 'no_answer'
  booking: string | null
}

export type OutcomeType =
  | 'booked' | 'callback_scheduled' | 'no_answer' | 'failed'
  | 'processed' | 'filled' | 'review_posted' | 'escalated'

export interface CallRecord {
  id: string; timestamp: string; patient_name: string; patient_phone: string
  reason: string; outcome: OutcomeType; appointment: string; provider: string
  duration_seconds: number; mode: 'simulation' | 'live' | 'simulation_fallback'
  module?: number; module_label?: string
}
