const crypto = require('crypto')

function isLive() {
  return !!(process.env.VAPI_API_KEY && process.env.VAPI_ASSISTANT_ID)
}

// Trigger an outbound callback to the patient via Vapi.
// Uses an imported Twilio number so no extra Vapi phone number purchase is needed.
// The clinic's Twilio number both receives missed calls AND makes the AI callback.
async function triggerCallback(patientPhone, clinicConfig, callRecordId) {
  if (!isLive()) {
    console.log('[Vapi] SIMULATED — would call', patientPhone)
    return { callId: `sim_${Date.now()}`, mode: 'simulation' }
  }

  // Prefer a Vapi-managed number (VAPI_PHONE_NUMBER_ID) if configured,
  // otherwise inject Twilio credentials directly into the Vapi call request.
  let phoneNumberConfig
  if (process.env.VAPI_PHONE_NUMBER_ID) {
    phoneNumberConfig = { phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID }
  } else {
    phoneNumberConfig = {
      phoneNumber: {
        twilioAccountSid:  process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken:   process.env.TWILIO_AUTH_TOKEN,
        twilioPhoneNumber: process.env.TWILIO_FROM_NUMBER,
      },
    }
  }

  const body = {
    assistantId: process.env.VAPI_ASSISTANT_ID,
    customer: { number: patientPhone },
    ...phoneNumberConfig,
    // Injected into system prompt at {{clinic_name}} / {{clinic_phone}} positions
    assistantOverrides: {
      variableValues: {
        clinic_name:  clinicConfig.name  || 'the clinic',
        clinic_phone: clinicConfig.phone || '',
      },
    },
    // Passed through to the end-of-call-report webhook for correlation
    metadata: {
      call_record_id:            callRecordId,
      clinic_id:                 clinicConfig.id || 'demo',
      patient_phone:             patientPhone,
      clinic_front_desk_number:  clinicConfig.frontDeskNumber
                                   || process.env.CLINIC_FRONT_DESK_NUMBER
                                   || '',
    },
  }

  const res = await fetch('https://api.vapi.ai/call/phone', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Vapi error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  console.log(`[Vapi] Outbound call initiated → ${data.id}`)
  return { callId: data.id, mode: 'live' }
}

// One-way SHA-256 hash of patient phone for PHIPA audit tables
function hashPhone(phone) {
  return crypto.createHash('sha256').update(String(phone || '')).digest('hex')
}

// Map Vapi webhook event types to internal state machine state IDs
const VAPI_STATE_MAP = {
  'call-started':       'connected',
  'transcript':         'identifying_reason',
  'end-of-call-report': 'complete',
}
function mapVapiEvent(eventType) { return VAPI_STATE_MAP[eventType] ?? null }

module.exports = { triggerCallback, isLive, mapVapiEvent, hashPhone }
