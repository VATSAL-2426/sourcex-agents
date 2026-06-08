// Twilio voice webhook — fires when a patient's forwarded call arrives.
// Flow: carrier forwards unanswered call → Twilio → POST /api/twilio/voice
//       → respond with TwiML immediately → trigger Vapi outbound callback async.
const express    = require('express')
const crypto     = require('crypto')
const { v4: uuidv4 } = require('uuid')
const router     = express.Router()
const vapiService    = require('../services/vapiService')
const storageService = require('../services/storageService')
const audit          = require('../services/auditService')
const { sseManager } = require('../services/stateMachine')
const clinic         = require('../config/clinic')

// ── Twilio signature validation ───────────────────────────────────────────────
// Prevents spoofed webhooks from triggering outbound calls.
// Skipped in dev mode when TWILIO_AUTH_TOKEN is not set.
function isValidTwilioRequest(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return true // dev mode — skip validation

  const sig = req.headers['x-twilio-signature']
  if (!sig) return false

  const proto   = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http')
  const url     = `${proto}://${req.headers.host}${req.originalUrl}`
  const params  = req.body || {}
  const message = url + Object.keys(params).sort().map(k => `${k}${params[k]}`).join('')
  const expected = crypto.createHmac('sha1', authToken).update(message).digest('base64')

  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'))
  } catch (_) {
    return false
  }
}

// ── POST /api/twilio/voice ────────────────────────────────────────────────────
// Twilio calls this when a forwarded call arrives. We must respond with TwiML
// within 15 seconds — so we respond immediately and fire the Vapi callback async.
router.post('/voice', async (req, res) => {
  if (!isValidTwilioRequest(req)) {
    console.warn('[Twilio] Rejected request — invalid signature')
    return res.status(403).type('text/xml').send('<Response></Response>')
  }

  const callerPhone = (req.body?.From || '').trim()
  const callSid     = req.body?.CallSid || uuidv4()
  const callRecordId = `twilio_${callSid}`

  // Respond to Twilio immediately with TwiML — must be under 15 seconds
  res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">We missed your call. Our team will call you back within a minute.</Say>
  <Hangup/>
</Response>`)

  // Broadcast missed-call event to dashboard via SSE
  sseManager.broadcast({
    type:      'missed_call_live',
    phone:     callerPhone ? callerPhone.replace(/\d(?=\d{4})/g, '*') : 'unknown',
    callSid,
    timestamp: new Date().toISOString(),
  })

  // Async: initiate Vapi callback + persist the event
  setImmediate(async () => {
    try {
      let vapiCallId = null

      if (callerPhone) {
        const result = await vapiService.triggerCallback(callerPhone, clinic, callRecordId)
        vapiCallId = result.callId || null
      }

      const record = {
        id:               callRecordId,
        timestamp:        new Date().toISOString(),
        patient_name:     'Unknown',       // Vapi AI collects name during callback
        patient_phone:    callerPhone,
        reason:           'Missed call — callback initiated',
        outcome:          'callback_initiated',
        appointment:      null,
        provider:         null,
        duration_seconds: 0,
        vapi_call_id:     vapiCallId,
        mode:             vapiService.isLive() ? 'live' : 'simulation',
        module:           1,
        module_label:     'Missed Call Recovery',
      }

      await storageService.saveCall(record)
      await audit.callSaved(record.id, 1, 'callback_initiated')

      console.log(`[Twilio] ${callerPhone || 'unknown'} → Vapi callback ${vapiCallId || 'sim'} initiated`)
    } catch (err) {
      console.error('[Twilio] Callback error:', err.message)
    }
  })
})

// ── POST /api/twilio/status ───────────────────────────────────────────────────
// Optional: Twilio sends call status updates (completed, busy, no-answer).
router.post('/status', (req, res) => {
  const { CallSid, CallStatus, From } = req.body || {}
  console.log(`[Twilio] Status — ${CallSid} from ${From}: ${CallStatus}`)
  res.type('text/xml').send('<Response></Response>')
})

module.exports = router
