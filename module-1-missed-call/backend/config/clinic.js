// Per-client clinic configuration — set via environment variables.
// All values fall back to demo defaults so simulation mode works without any .env.
module.exports = {
  id:        process.env.CLINIC_ID       || 'demo',
  name:      process.env.CLINIC_NAME     || 'Northview Medical Centre',
  phone:     process.env.CLINIC_PHONE    || '+1 (416) 555-0100',
  fax:       process.env.CLINIC_FAX      || '+1 (416) 555-0101',
  address:   process.env.CLINIC_ADDRESS  || '1200 Sheppard Ave E, North York, ON M2K 2W4',
  timezone:  process.env.CLINIC_TIMEZONE || 'America/Toronto',
  hoursStart: parseInt(process.env.CLINIC_HOURS_START || '8'),   // 8 AM
  hoursEnd:   parseInt(process.env.CLINIC_HOURS_END   || '17'),  // 5 PM

  // AI agent persona
  agentName: process.env.AGENT_NAME || 'Maya',

  // Providers (JSON array or single name)
  get providers() {
    try { return JSON.parse(process.env.CLINIC_PROVIDERS) } catch (_) {}
    if (process.env.CLINIC_PROVIDER_NAME) {
      return [{ name: process.env.CLINIC_PROVIDER_NAME, specialty: process.env.CLINIC_PROVIDER_SPECIALTY || 'General' }]
    }
    return [{ name: 'Dr. Anand Mehta', specialty: 'Physiotherapy' }]
  },

  get primaryProvider() { return this.providers[0]?.name || 'Dr. Anand Mehta' },

  // Financial (for ROI reporting)
  avgAppointmentFee: parseInt(process.env.CLINIC_AVG_FEE || '350'),

  // Google Reviews
  googlePlaceId: process.env.GOOGLE_PLACE_ID || null,
  googleReviewUrl: process.env.GOOGLE_REVIEW_URL || null,
}
