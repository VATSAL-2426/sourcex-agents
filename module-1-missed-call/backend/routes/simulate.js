const express     = require('express')
const router      = express.Router()
const { stateMachine, MODULE_CONFIGS } = require('../services/stateMachine')
const vapiService = require('../services/vapiService')
const clinic      = require('../config/clinic')

router.post('/', async (req, res) => {
  const speed    = parseFloat(req.body?.speed)
  const safeSpeed = [0.5, 1, 2].includes(speed) ? speed : 1
  const moduleId  = [1,2,3,4,5,6,7].includes(parseInt(req.body?.moduleId))
                    ? parseInt(req.body.moduleId) : 1

  if (req.body?.resetOnly) {
    stateMachine.reset()
    return res.json({ ok: true, reset: true })
  }

  stateMachine.reset()

  // Live mode: use Vapi for Module 1 (missed call recovery)
  if (vapiService.isLive() && moduleId === 1) {
    try {
      const patient      = MODULE_CONFIGS[1].patient
      const callRecordId = `sim_${Date.now()}`
      const call         = await vapiService.triggerCallback(patient.phone, clinic, callRecordId)
      return res.json({ ok: true, speed: safeSpeed, moduleId, mode: 'live', callId: call.callId })
    } catch (err) {
      // Fall through to simulation if Vapi call fails
      stateMachine.start(safeSpeed, moduleId)
      return res.json({ ok: true, speed: safeSpeed, moduleId, mode: 'simulation_fallback', error: err.message })
    }
  }

  stateMachine.start(safeSpeed, moduleId)
  res.json({ ok: true, speed: safeSpeed, moduleId, mode: 'simulation' })
})

module.exports = router
