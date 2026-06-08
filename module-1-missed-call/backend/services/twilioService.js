// Twilio SMS service — activates with TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER.
// Used by Module 6 (Review Generation) to send follow-up SMS to patients.
const isLive = () => !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_FROM_NUMBER
)

async function sendSms(to, body) {
  if (!isLive()) {
    console.log(`[Twilio] SIMULATED → ${to}: ${body.slice(0, 60)}...`)
    return { sid: `sim_sms_${Date.now()}`, status: 'simulated' }
  }
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
  const params = new URLSearchParams({ To: to, From: process.env.TWILIO_FROM_NUMBER, Body: body })
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  if (!res.ok) throw new Error(`Twilio error: ${await res.text()}`)
  return res.json()
}

// Build the review follow-up message for a patient
function buildReviewSms(patientName, clinicName, reviewUrl) {
  const name = patientName.split(' ')[0]
  return `Hi ${name}! Thank you for visiting ${clinicName} today. We'd love your feedback — it takes 30 seconds. Tap to leave a Google review: ${reviewUrl}`
}

module.exports = { sendSms, buildReviewSms, isLive }
