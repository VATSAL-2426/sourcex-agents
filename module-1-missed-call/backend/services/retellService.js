const isLive = () => !!(process.env.RETELL_API_KEY && process.env.RETELL_AGENT_ID)

async function initiateCall(patient) {
  if (!isLive()) {
    console.log('[Retell] SIMULATED — would call', patient.phone)
    return { callId: `sim_${Date.now()}`, mode: 'simulation' }
  }
  const res = await fetch('https://api.retellai.com/v2/create-phone-call', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RETELL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_number: process.env.RETELL_FROM_NUMBER, to_number: patient.phone, agent_id: process.env.RETELL_AGENT_ID, metadata: { patient_name: patient.name } }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const RETELL_STATE_MAP = { call_started: 'connected', call_analyzed: 'identifying_reason', call_ended: 'complete' }
function mapRetellEvent(eventType) { return RETELL_STATE_MAP[eventType] ?? null }

module.exports = { initiateCall, isLive, mapRetellEvent }
