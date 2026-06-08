const { v4: uuidv4 } = require('uuid')
const storageService = require('./storageService')
const clinic = require('../config/clinic')

// ── Module configs ────────────────────────────────────────────────────────────

const MODULE_CONFIGS = {

  // ── Module 1: Missed Call Recovery ────────────────────────────────────────
  1: {
    name: 'Missed Call Recovery',
    states: [
      { id: 'idle',                label: 'System Ready',                                              delay: null,  color: 'muted'  },
      { id: 'missed_call',         label: 'Missed call detected from patient +1 (416) 555-0194',       delay: 0,     color: 'amber'  },
      { id: 'initiating_callback', label: 'AI system initiating callback protocol',                     delay: 2000,  color: 'blue'   },
      { id: 'dialing',             label: 'Outbound call placed to patient',                            delay: 4000,  color: 'blue'   },
      { id: 'connected',           label: 'Patient answered. Agent greeting initiated.',                delay: 7000,  color: 'green'  },
      { id: 'identifying_reason',  label: 'Patient requesting appointment — physiotherapy follow-up',  delay: 10000, color: 'green'  },
      { id: 'booking_in_progress', label: 'Checking availability. Booking slot...',                    delay: 14000, color: 'blue'   },
      { id: 'confirmed',           label: 'Appointment confirmed: Friday May 15, 2:30 PM',             delay: 17000, color: 'green'  },
      { id: 'complete',            label: 'Record saved. Loop complete.',                              delay: 20000, color: 'accent' },
    ],
    transcript: [
      { speaker: 'Agent',   text: `Hi, this is ${clinic.agentName} calling from ${clinic.name}. I'm reaching out because we just missed your call. Am I speaking with Sarah?` },
      { speaker: 'Patient', text: "Yes, hi. I was calling to book a follow-up appointment." },
      { speaker: 'Agent',   text: "Of course, Sarah. I can see your last visit was with Dr. Mehta in December. Are you looking to continue your physiotherapy sessions?" },
      { speaker: 'Patient', text: "Yes, exactly. Whenever he's available." },
      { speaker: 'Agent',   text: "I have Friday May 15th at 2:30 PM available with Dr. Anand Mehta. Does that work for you?" },
      { speaker: 'Patient', text: "That's perfect." },
      { speaker: 'Agent',   text: "Done — you're booked for May 15th at 2:30 PM. You'll receive a confirmation text shortly. Thank you, Sarah." },
    ],
    transcriptStartState: 'connected',
    patient: {
      name: 'Sarah Mitchell', phone: '+1 (416) 555-0194',
      dob: 'March 22, 1985', lastVisit: 'December 14, 2024',
      reason: 'Physiotherapy follow-up', provider: 'Dr. Anand Mehta',
    },
    buildRecord: (callId, startedAt) => ({
      id: `call_${callId}`,
      timestamp: startedAt.toISOString(),
      patient_name: 'Sarah Mitchell',
      patient_phone: '+1 (416) 555-0194',
      reason: 'Physiotherapy follow-up',
      outcome: 'booked',
      appointment: 'Friday May 15 2026, 2:30 PM',
      provider: clinic.primaryProvider,
      module: 1,
      module_label: 'Missed Call Recovery',
    }),
  },

  // ── Module 2: No-Show Recovery ─────────────────────────────────────────────
  2: {
    name: 'No-Show Recovery',
    states: [
      { id: 'idle',               label: 'System Ready',                                               delay: null,  color: 'muted'  },
      { id: 'no_show_detected',   label: 'No-show: James Okafor missed 10:00 AM with Dr. Mehta',      delay: 0,     color: 'amber'  },
      { id: 'reviewing_history',  label: 'Reviewing appointment history and patient record',            delay: 2000,  color: 'blue'   },
      { id: 'initiating_outreach',label: 'AI agent initiating recovery call',                          delay: 4500,  color: 'blue'   },
      { id: 'dialing',            label: 'Outbound call placed to patient',                            delay: 6500,  color: 'blue'   },
      { id: 'connected',          label: 'Patient answered. Identifying reason for no-show.',          delay: 9500,  color: 'green'  },
      { id: 'reason_captured',    label: 'Reason: transportation issue — patient wants to rebook',    delay: 13000, color: 'green'  },
      { id: 'rebooking',          label: 'Searching for next available slot...',                       delay: 16000, color: 'blue'   },
      { id: 'rebooked',           label: 'Appointment rebooked: Thursday May 22, 2:00 PM',            delay: 19000, color: 'green'  },
      { id: 'complete',           label: 'Record updated. No-show recovered.',                         delay: 21000, color: 'accent' },
    ],
    transcript: [
      { speaker: 'Agent',   text: `Hi James, this is ${clinic.agentName} calling from ${clinic.name}. We noticed you missed your 10:00 AM appointment this morning — just checking in to make sure everything is okay.` },
      { speaker: 'Patient', text: "Oh hi, yes — I'm so sorry, I had a car issue and couldn't make it in time." },
      { speaker: 'Agent',   text: "No worries at all, these things happen. Would you like to get rebooked? We have availability later this week with Dr. Mehta." },
      { speaker: 'Patient', text: "Yes please, that would be great." },
      { speaker: 'Agent',   text: "I have Thursday May 22nd at 2:00 PM available. Does that work for you?" },
      { speaker: 'Patient', text: "That's perfect, thank you." },
      { speaker: 'Agent',   text: "You're all set for May 22nd at 2:00 PM. We'll send a reminder the day before. Thanks James, see you then." },
    ],
    transcriptStartState: 'connected',
    patient: {
      name: 'James Okafor', phone: '+1 (647) 555-0382',
      dob: 'July 8, 1979', lastVisit: 'April 3, 2026',
      reason: 'Missed appointment — chiropractic adjustment', provider: 'Dr. Anand Mehta',
    },
    buildRecord: (callId, startedAt) => ({
      id: `call_${callId}`,
      timestamp: startedAt.toISOString(),
      patient_name: 'James Okafor',
      patient_phone: '+1 (647) 555-0382',
      reason: 'No-show recovery — chiropractic',
      outcome: 'booked',
      appointment: 'Thursday May 22 2026, 2:00 PM',
      provider: clinic.primaryProvider,
      module: 2,
      module_label: 'No-Show Recovery',
    }),
  },

  // ── Module 3: Patient Reactivation ─────────────────────────────────────────
  3: {
    name: 'Patient Reactivation',
    states: [
      { id: 'idle',           label: 'System Ready',                                                 delay: null,  color: 'muted'  },
      { id: 'campaign_start', label: 'Reactivation campaign initiated — 5 dormant patients identified', delay: 0,  color: 'blue'   },
      { id: 'contact_1',      label: 'Contacting Maria Santos — last visit 4 months ago',            delay: 2500,  color: 'blue'   },
      { id: 'booked_1',       label: 'Maria Santos — booked May 19, 3:00 PM ✓',                     delay: 6500,  color: 'green'  },
      { id: 'contact_2',      label: 'Contacting David Kim — last visit 6 months ago',               delay: 9500,  color: 'blue'   },
      { id: 'voicemail_2',    label: 'David Kim — voicemail left, follow-up in 24 hours',            delay: 13500, color: 'amber'  },
      { id: 'contact_3',      label: 'Contacting Linda Patel — last visit 5 months ago',             delay: 16500, color: 'blue'   },
      { id: 'booked_3',       label: 'Linda Patel — booked May 20, 9:30 AM ✓',                      delay: 20500, color: 'green'  },
      { id: 'contact_4',      label: 'Contacting Robert Chen — last visit 7 months ago',             delay: 23500, color: 'blue'   },
      { id: 'no_answer_4',    label: 'Robert Chen — no answer, SMS follow-up scheduled',             delay: 27000, color: 'amber'  },
      { id: 'contact_5',      label: 'Contacting Anna Kowalski — last visit 8 months ago',           delay: 30000, color: 'blue'   },
      { id: 'booked_5',       label: 'Anna Kowalski — booked May 21, 11:00 AM ✓',                   delay: 34000, color: 'green'  },
      { id: 'complete',       label: 'Campaign complete — 3 booked, 1 voicemail, 1 no answer. Est. $2,100 recovered.', delay: 36000, color: 'accent' },
    ],
    campaignPatients: [
      { id: 1, name: 'Maria Santos',  phone: '+1 (647) 555-0211', lastVisit: '4 months ago', status: 'pending', booking: null },
      { id: 2, name: 'David Kim',     phone: '+1 (905) 555-0334', lastVisit: '6 months ago', status: 'pending', booking: null },
      { id: 3, name: 'Linda Patel',   phone: '+1 (416) 555-0478', lastVisit: '5 months ago', status: 'pending', booking: null },
      { id: 4, name: 'Robert Chen',   phone: '+1 (647) 555-0562', lastVisit: '7 months ago', status: 'pending', booking: null },
      { id: 5, name: 'Anna Kowalski', phone: '+1 (905) 555-0693', lastVisit: '8 months ago', status: 'pending', booking: null },
    ],
    // Map state IDs to campaign patient updates
    campaignUpdates: {
      'contact_1':   { patientId: 1, status: 'calling'   },
      'booked_1':    { patientId: 1, status: 'booked',   booking: 'May 19, 3:00 PM',  revenue: 700  },
      'contact_2':   { patientId: 2, status: 'calling'   },
      'voicemail_2': { patientId: 2, status: 'voicemail' },
      'contact_3':   { patientId: 3, status: 'calling'   },
      'booked_3':    { patientId: 3, status: 'booked',   booking: 'May 20, 9:30 AM',  revenue: 700  },
      'contact_4':   { patientId: 4, status: 'calling'   },
      'no_answer_4': { patientId: 4, status: 'no_answer' },
      'contact_5':   { patientId: 5, status: 'calling'   },
      'booked_5':    { patientId: 5, status: 'booked',   booking: 'May 21, 11:00 AM', revenue: 700  },
    },
    buildRecord: (callId, startedAt) => ({
      id: `call_${callId}`,
      timestamp: startedAt.toISOString(),
      patient_name: 'Campaign: 5 patients',
      patient_phone: '—',
      reason: 'Patient reactivation campaign',
      outcome: 'booked',
      appointment: '3 appointments booked',
      provider: clinic.primaryProvider,
      module: 3,
      module_label: 'Patient Reactivation',
    }),
  },

  // ── Module 4: Fax Automation ──────────────────────────────────────────────
  4: {
    name: 'Fax Automation',
    states: [
      { id: 'idle',            label: 'System Ready',                                               delay: null,  color: 'muted'  },
      { id: 'fax_received',    label: 'Incoming fax detected — 3 pages from WSIB',                 delay: 0,     color: 'amber'  },
      { id: 'scanning',        label: 'AI reading and scanning document content',                   delay: 2500,  color: 'blue'   },
      { id: 'classifying',     label: 'Document classified: WSIB authorization form',              delay: 5500,  color: 'blue'   },
      { id: 'extracting',      label: 'Extracting patient info and authorization details',          delay: 8500,  color: 'blue'   },
      { id: 'routing',         label: `Routing to ${clinic.primaryProvider}'s queue — flagged urgent`, delay: 11500, color: 'green'  },
      { id: 'notifying',       label: 'Provider notified via secure message',                      delay: 14000, color: 'green'  },
      { id: 'complete',        label: 'Fax processed and filed. Zero human touches.',              delay: 16000, color: 'accent' },
    ],
    buildRecord: (callId, startedAt) => ({
      id: `call_${callId}`,
      timestamp: startedAt.toISOString(),
      patient_name: 'James Okafor',
      patient_phone: 'Fax: +1 (416) 555-0100',
      reason: 'WSIB authorization form — 3 pages',
      outcome: 'processed',
      appointment: 'Routed to Dr. Anand Mehta',
      provider: clinic.primaryProvider,
      module: 4,
      module_label: 'Fax Automation',
    }),
  },

  // ── Module 5: Waitlist Management ─────────────────────────────────────────
  5: {
    name: 'Waitlist Management',
    states: [
      { id: 'idle',              label: 'System Ready',                                             delay: null,  color: 'muted'  },
      { id: 'slot_opened',       label: 'Cancellation received: May 16, 10:30 AM slot opened',     delay: 0,     color: 'amber'  },
      { id: 'scanning_waitlist', label: 'Scanning waitlist — 8 patients waiting',                  delay: 2000,  color: 'blue'   },
      { id: 'matching',          label: 'Matching by availability, condition, and preference',      delay: 4500,  color: 'blue'   },
      { id: 'contacting_match',  label: 'Contacting top match: Kevin Tran',                        delay: 7000,  color: 'blue'   },
      { id: 'patient_confirmed', label: 'Kevin Tran confirmed for May 16, 10:30 AM',               delay: 10500, color: 'green'  },
      { id: 'slot_filled',       label: 'Slot filled. Calendar updated. Confirmation sent.',       delay: 13000, color: 'green'  },
      { id: 'complete',          label: 'Cancellation recovered in 13 seconds.',                   delay: 15000, color: 'accent' },
    ],
    buildRecord: (callId, startedAt) => ({
      id: `call_${callId}`,
      timestamp: startedAt.toISOString(),
      patient_name: 'Kevin Tran',
      patient_phone: '+1 (647) 555-0291',
      reason: 'Waitlist fill — shoulder physiotherapy',
      outcome: 'filled',
      appointment: 'Friday May 16 2026, 10:30 AM',
      provider: clinic.primaryProvider,
      module: 5,
      module_label: 'Waitlist Management',
    }),
  },

  // ── Module 6: Review Generation ───────────────────────────────────────────
  6: {
    name: 'Review Generation',
    states: [
      { id: 'idle',             label: 'System Ready',                                              delay: null,  color: 'muted'  },
      { id: 'visit_completed',  label: 'Post-visit trigger: Maria Santos — appointment ended',      delay: 0,     color: 'blue'   },
      { id: 'delay_window',     label: 'Applying 2-hour delay — optimal send window',              delay: 2500,  color: 'blue'   },
      { id: 'sending_sms',      label: 'Sending personalized follow-up SMS to patient',            delay: 5000,  color: 'blue'   },
      { id: 'sms_delivered',    label: 'SMS delivered. Awaiting patient response.',                delay: 7500,  color: 'green'  },
      { id: 'response_received',label: 'Patient rated experience: 5 stars',                        delay: 11000, color: 'green'  },
      { id: 'review_requested', label: 'Google review link sent to patient',                       delay: 13500, color: 'blue'   },
      { id: 'review_posted',    label: 'New 5-star Google review posted ✓',                        delay: 17000, color: 'green'  },
      { id: 'complete',         label: 'Review captured. Clinic rating updated.',                  delay: 19000, color: 'accent' },
    ],
    buildRecord: (callId, startedAt) => ({
      id: `call_${callId}`,
      timestamp: startedAt.toISOString(),
      patient_name: 'Maria Santos',
      patient_phone: '+1 (647) 555-0211',
      reason: 'Post-visit review follow-up',
      outcome: 'review_posted',
      appointment: '5-star Google review posted',
      provider: clinic.primaryProvider,
      module: 6,
      module_label: 'Review Generation',
    }),
  },

  // ── Module 7: Insurance Follow-up ─────────────────────────────────────────
  7: {
    name: 'Insurance Follow-up',
    states: [
      { id: 'idle',             label: 'System Ready',                                              delay: null,  color: 'muted'  },
      { id: 'claim_flagged',    label: 'Unpaid claim: $340 — WSIB — 47 days outstanding',          delay: 0,     color: 'amber'  },
      { id: 'reviewing_claim',  label: 'AI reviewing claim status and submission history',          delay: 3000,  color: 'blue'   },
      { id: 'drafting',         label: 'Drafting follow-up letter to insurer',                     delay: 6000,  color: 'blue'   },
      { id: 'sending_followup', label: 'Follow-up sent via fax and secure portal',                 delay: 9000,  color: 'blue'   },
      { id: 'response_received',label: 'Insurer response: processing delay — ETA 5 business days', delay: 13000, color: 'green'  },
      { id: 'status_updated',   label: 'Claim status updated. Reminder set for May 19.',          delay: 15500, color: 'green'  },
      { id: 'complete',         label: 'Follow-up complete. Claim escalated to priority queue.',   delay: 17500, color: 'accent' },
    ],
    buildRecord: (callId, startedAt) => ({
      id: `call_${callId}`,
      timestamp: startedAt.toISOString(),
      patient_name: 'James Okafor',
      patient_phone: 'WSIB — Claim #W-2024-8821',
      reason: 'Unpaid insurance claim — $340',
      outcome: 'escalated',
      appointment: 'Follow-up sent. ETA May 19.',
      provider: clinic.primaryProvider,
      module: 7,
      module_label: 'Insurance Follow-up',
    }),
  },
}

// ── SSE Manager ───────────────────────────────────────────────────────────────

class SSEManager {
  constructor() { this._clients = new Map() }
  addClient(id, res) { this._clients.set(id, res) }
  removeClient(id) { this._clients.delete(id) }
  broadcast(event) {
    const data = `data: ${JSON.stringify(event)}\n\n`
    for (const res of this._clients.values()) {
      try { res.write(data) } catch (_) {}
    }
  }
}

// ── Simulation Engine ─────────────────────────────────────────────────────────

class SimulationEngine {
  constructor(sse) {
    this._sse = sse
    this._timers = []
    this._currentStateId = 'idle'
    this._startedAt = null
    this._speedMultiplier = 1
    this._callId = null
    this._moduleId = 1
    this._campaignPatients = []
    this._campaignRevenue = 0
  }

  start(speed = 1, moduleId = 1) {
    this._speedMultiplier = speed
    this._moduleId = moduleId
    this._startedAt = new Date()
    this._callId = uuidv4()

    const config = MODULE_CONFIGS[moduleId]
    if (!config) return

    // Reset campaign state for module 3
    if (moduleId === 3) {
      this._campaignPatients = config.campaignPatients.map(p => ({ ...p }))
      this._campaignRevenue = 0
    }

    const active = config.states.filter(s => s.id !== 'idle')
    active.forEach(state => {
      const t = setTimeout(() => this._transition(state, config), state.delay / speed)
      this._timers.push(t)
    })

    // Schedule transcript lines for modules 1 and 2
    if (config.transcript && config.transcriptStartState) {
      const startState = config.states.find(s => s.id === config.transcriptStartState)
      const startDelay = (startState?.delay ?? 7000) / speed
      config.transcript.forEach((line, i) => {
        const t = setTimeout(() => {
          this._sse.broadcast({ type: 'transcript_line', transcriptLine: line })
        }, startDelay + ((i + 1) * (1800 / speed)))
        this._timers.push(t)
      })
    }
  }

  reset() {
    this._timers.forEach(t => clearTimeout(t))
    this._timers = []
    this._currentStateId = 'idle'
    this._startedAt = null
    this._callId = null
    this._campaignPatients = []
    this._campaignRevenue = 0
    this._sse.broadcast({
      type: 'state_change', state: 'idle', label: 'System Ready', color: 'muted',
      timestamp: new Date().toISOString(), speedMultiplier: this._speedMultiplier,
      patient: null, moduleId: this._moduleId,
    })
  }

  _transition(state, config) {
    this._currentStateId = state.id

    // Handle campaign patient updates for module 3
    if (this._moduleId === 3 && config.campaignUpdates?.[state.id]) {
      const update = config.campaignUpdates[state.id]
      this._campaignPatients = this._campaignPatients.map(p =>
        p.id === update.patientId
          ? { ...p, status: update.status, booking: update.booking ?? p.booking }
          : p
      )
      if (update.revenue) this._campaignRevenue += update.revenue
      this._sse.broadcast({
        type: 'campaign_update',
        patients: this._campaignPatients,
        revenue: this._campaignRevenue,
        timestamp: new Date().toISOString(),
      })
    }

    this._sse.broadcast({
      type: 'state_change',
      state: state.id, label: state.label, color: state.color,
      timestamp: new Date().toISOString(),
      speedMultiplier: this._speedMultiplier,
      moduleId: this._moduleId,
      patient: this._moduleId !== 3 ? config.patient : null,
    })

    if (state.id === 'complete') this._finalise(config)
  }

  async _finalise(config) {
    if (!this._startedAt) return // external Vapi event hit a never-started machine
    const record = {
      ...config.buildRecord(this._callId, this._startedAt),
      duration_seconds: Math.round((Date.now() - this._startedAt.getTime()) / 1000),
      mode: process.env.VAPI_API_KEY ? 'live' : 'simulation',
    }
    await storageService.saveCall(record)
    this._sse.broadcast({ type: 'complete', callRecord: record, timestamp: new Date().toISOString() })
  }

  getStatus() {
    const config = MODULE_CONFIGS[this._moduleId]
    return {
      state: this._currentStateId,
      label: config?.states.find(s => s.id === this._currentStateId)?.label ?? 'System Ready',
      startedAt: this._startedAt,
      speedMultiplier: this._speedMultiplier,
      moduleId: this._moduleId,
      patient: this._currentStateId !== 'idle' && this._moduleId !== 3 ? config?.patient : null,
      campaignPatients: this._moduleId === 3 ? this._campaignPatients : undefined,
      campaignRevenue: this._moduleId === 3 ? this._campaignRevenue : undefined,
    }
  }
}

const sseManager = new SSEManager()
const stateMachine = new SimulationEngine(sseManager)
module.exports = { stateMachine, sseManager, MODULE_CONFIGS }
