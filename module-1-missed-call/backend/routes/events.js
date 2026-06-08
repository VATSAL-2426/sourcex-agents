const express = require('express')
const router = express.Router()
const { stateMachine, sseManager } = require('../services/stateMachine')

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const clientId = Date.now() + Math.random()
  sseManager.addClient(clientId, res)

  const status = stateMachine.getStatus()
  res.write(`data: ${JSON.stringify({ type: 'init', ...status, timestamp: new Date().toISOString() })}\n\n`)

  const keepAlive = setInterval(() => {
    try { res.write(': ping\n\n') } catch (_) { clearInterval(keepAlive) }
  }, 25000)

  req.on('close', () => { sseManager.removeClient(clientId); clearInterval(keepAlive) })
})

module.exports = router
