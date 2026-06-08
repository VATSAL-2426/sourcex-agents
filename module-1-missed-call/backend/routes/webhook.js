// Simulation control endpoint — drives the state machine for demo mode.
// Real Vapi webhook events are handled in routes/vapi.js.
const express = require('express')
const router  = express.Router()
const { stateMachine, MODULE_CONFIGS } = require('../services/stateMachine')
const { mapVapiEvent } = require('../services/vapiService')

// POST /api/retell/ — still wired in server.js for backwards compat.
// Maps Vapi event types to state machine transitions when called by tests or live Vapi events.
router.post('/', (req, res) => {
  const { event } = req.body ?? {}
  if (!event) return res.status(400).json({ error: 'Missing event' })
  const stateId = mapVapiEvent(event)
  if (stateId) {
    const stateObj = MODULE_CONFIGS[1].states.find(s => s.id === stateId)
    if (stateObj) stateMachine._transition(stateObj, MODULE_CONFIGS[1])
  }
  res.json({ received: true })
})

// POST /api/retell/missed-call — simulation trigger (called by frontend demo button)
router.post('/missed-call', (req, res) => {
  const speed = parseFloat(req.body?.speed) || 1
  stateMachine.reset()
  stateMachine.start(speed)
  res.json({ ok: true, triggered: true })
})

module.exports = router
