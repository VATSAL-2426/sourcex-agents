const express = require('express')
const router = express.Router()
const storageService = require('../services/storageService')
const audit = require('../services/auditService')
const clinic = require('../config/clinic')

// Outcomes that count as a recovered booking
const BOOKED_OUTCOMES = new Set(['booked', 'filled'])

// Estimated revenue per outcome (override with clinic.avgAppointmentFee)
function revenueFor(outcome) {
  const fee = clinic.avgAppointmentFee
  if (BOOKED_OUTCOMES.has(outcome)) return fee
  if (outcome === 'escalated') return fee * 0.5 // partial credit for insurance follow-up
  return 0
}

// GET /api/reports?period=30
router.get('/', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.period) || 30, 365)
    const records = await storageService.getReportData(days)
    await audit.reportRead(days, req.ip)

    // Summary
    const booked = records.filter(r => BOOKED_OUTCOMES.has(r.outcome)).length
    const estimatedRevenue = records.reduce((s, r) => s + revenueFor(r.outcome), 0)
    const avgDuration = records.length
      ? Math.round(records.reduce((s, r) => s + (r.duration_seconds || 0), 0) / records.length)
      : 0

    const summary = {
      totalHandled: records.length,
      booked,
      successRate: records.length ? Math.round((booked / records.length) * 100) : 0,
      estimatedRevenue,
      avgDurationSeconds: avgDuration,
    }

    // By module
    const byModule = {}
    records.forEach(r => {
      if (!r.module) return
      if (!byModule[r.module]) byModule[r.module] = { label: r.module_label || `Module ${r.module}`, handled: 0, booked: 0, revenue: 0 }
      byModule[r.module].handled++
      if (BOOKED_OUTCOMES.has(r.outcome)) byModule[r.module].booked++
      byModule[r.module].revenue += revenueFor(r.outcome)
    })

    // By outcome
    const byOutcome = {}
    records.forEach(r => { byOutcome[r.outcome] = (byOutcome[r.outcome] || 0) + 1 })

    // Daily trend (last N days, grouped by date)
    const trend = {}
    const now = Date.now()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000).toISOString().slice(0, 10)
      trend[d] = { date: d, handled: 0, booked: 0 }
    }
    records.forEach(r => {
      const d = r.timestamp?.slice(0, 10)
      if (d && trend[d]) {
        trend[d].handled++
        if (BOOKED_OUTCOMES.has(r.outcome)) trend[d].booked++
      }
    })

    res.json({
      period: { days },
      clinic: clinic.name,
      avgFee: clinic.avgAppointmentFee,
      summary,
      byModule,
      byOutcome,
      trend: Object.values(trend),
    })
  } catch (err) {
    console.error('[Reports]', err.message)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

module.exports = router
