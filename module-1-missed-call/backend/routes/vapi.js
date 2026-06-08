// Vapi.ai webhook handler
// Vapi fires events to this endpoint during and after AI calls.
// The critical event is 'end-of-call-report' which carries the booking outcome,
// triggers the front-desk SMS, and updates the PHIPA audit tables.
const express = require('express')
const router  = express.Router()

const { stateMachine, MODULE_CONFIGS } = require('../services/stateMachine')
const { mapVapiEvent, hashPhone }      = require('../services/vapiService')
const storageService                   = require('../services/storageService')
const audit                            = require('../services/auditService')
const { sseManager }                   = require('../services/stateMachine')

// ── POST /api/vapi/webhook ────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  // Respond immediately — Vapi times out if we hold the response
  res.json({ received: true })

  const payload   = req.body ?? {}
  // Vapi wraps events in a 'message' envelope in some versions
  const msg       = payload.message ?? payload
  const eventType = msg.type ?? payload.type

  if (!eventType) return

  // Drive the live dashboard state machine for real calls
  // Wrapped in try/catch — a state machine error must never crash the server
  // and block the booking logic that follows.
  const stateId = mapVapiEvent(eventType)
  if (stateId) {
    const stateObj = MODULE_CONFIGS[1].states.find(s => s.id === stateId)
    if (stateObj) {
      try { stateMachine._transition(stateObj, MODULE_CONFIGS[1]) }
      catch (err) { console.error('[Vapi] State machine error (non-fatal):', err.message) }
    }
  }

  // Broadcast raw event to SSE clients so dashboard can react immediately
  sseManager.broadcast({ type: 'vapi_event', eventType, timestamp: new Date().toISOString() })

  // Only the end-of-call-report contains booking outcome + structured data
  if (eventType !== 'end-of-call-report') return

  setImmediate(async () => {
    try {
      const call       = msg.call       ?? {}
      const analysis   = msg.analysis   ?? {}
      const structured = analysis.structuredData ?? {}
      const meta       = call.metadata  ?? {}

      const callRecordId       = meta.call_record_id        || null
      const clinicId           = meta.clinic_id             || 'demo'
      const patientPhone       = meta.patient_phone         || ''
      const frontDeskNumber    = meta.clinic_front_desk_number
                                   || process.env.CLINIC_FRONT_DESK_NUMBER
                                   || ''

      const patientName       = structured.patient_name       || 'Patient'
      const dateOfBirth       = structured.date_of_birth      || null
      const isExisting        = structured.is_existing_patient ?? null
      const preferredProvider = structured.preferred_provider || null
      const preferredTime     = structured.preferred_time     || 'to be confirmed'
      const reason            = structured.reason             || 'appointment'
      const outcome           = structured.outcome            || guessOutcome(msg.endedReason)
      const vapiCallId     = call.id || `vapi_${Date.now()}`

      const startedAt  = call.startedAt  ? new Date(call.startedAt)  : new Date()
      const endedAt    = call.endedAt    ? new Date(call.endedAt)    : new Date()
      const durationSec = Math.max(0, Math.round((endedAt - startedAt) / 1000))

      console.log(`[Vapi] End-of-call — ${vapiCallId} | outcome: ${outcome} | patient: ${patientName}`)

      // Update the original call_record (created by Twilio webhook) with outcome
      if (callRecordId) {
        await storageService.updateCallOutcome(callRecordId, {
          patient_name:     patientName,
          appointment:      outcome === 'booked' ? preferredTime : null,
          reason,
          outcome,
          duration_seconds: durationSec,
          vapi_call_id:     vapiCallId,
        })
      }

      // PHIPA audit — log to call_events table (phone hashed, never raw)
      const callEventId = await storageService.logCallEvent({
        clinicId,
        patientPhoneHash:  hashPhone(patientPhone),
        callbackAnswered:  outcome !== 'no_answer' && outcome !== 'voicemail',
        bookingOutcome:    outcome,
        callDurationSec:   durationSec,
        vapiCallId,
      })

      // Booking confirmed → log it and alert front desk by SMS
      if (outcome === 'booked') {
        await storageService.logBooking({
          clinicId,
          callEventId,
          patientName,
          preferredTime,
          reason,
          isExisting,
          preferredProvider,
          source: 'missed_call',
        })

        if (frontDeskNumber) {
          const patientType = isExisting === true  ? 'Existing patient'
                           : isExisting === false ? 'New patient'
                           : 'Patient (unknown)'
        const smsBody = [
            `SOURCE X Recovery: ${patientName} wants to book ${preferredTime} for ${reason}.`,
            dateOfBirth       ? `DOB: ${dateOfBirth}.`                            : '',
            `${patientType}.`,
            preferredProvider ? `Requested: ${preferredProvider}.`                : '',
            patientPhone      ? `Call back: ${patientPhone}.`                     : '',
            `Add to EMR. — SOURCE X`,
          ].filter(Boolean).join(' ')

          await sendFrontDeskSms(frontDeskNumber, smsBody, clinicId)
        } else {
          console.log('[Vapi] No front desk number configured — skipping SMS')
        }
      }

      await audit.callCompleted(vapiCallId, clinicId, outcome)
    } catch (err) {
      console.error('[Vapi] Webhook processing error:', err.message)
    }
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

// Infer outcome from Vapi's endedReason when structured data is absent
function guessOutcome(endedReason) {
  if (!endedReason) return 'no_answer'
  const r = String(endedReason).toLowerCase()
  if (r.includes('customer-ended') || r.includes('assistant-ended')) return 'declined'
  if (r.includes('no-answer') || r.includes('busy'))                  return 'no_answer'
  if (r.includes('voicemail'))                                         return 'voicemail'
  return 'no_answer'
}

// Send SMS to clinic front desk via Twilio REST API (no SDK dependency)
async function sendFrontDeskSms(to, body, clinicId) {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_FROM_NUMBER

  if (!sid || !token || !from) {
    console.log('[Twilio SMS] Skipped — TWILIO_ACCOUNT_SID / AUTH_TOKEN / FROM_NUMBER not set')
    return
  }

  const params = new URLSearchParams({ To: to, From: from, Body: body })
  const auth   = Buffer.from(`${sid}:${token}`).toString('base64')

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method:  'POST',
        headers: {
          Authorization:  `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || JSON.stringify(data))
    console.log(`[Twilio SMS] Sent to ${to} — SID: ${data.sid}`)
    await storageService.logSmsEvent({ clinicId, type: 'front_desk_alert', status: 'sent',   twilioSid: data.sid })
  } catch (err) {
    console.error('[Twilio SMS] Error:', err.message)
    await storageService.logSmsEvent({ clinicId, type: 'front_desk_alert', status: 'failed' })
  }
}

module.exports = router
