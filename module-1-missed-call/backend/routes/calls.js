const express = require('express')
const router = express.Router()
const storageService = require('../services/storageService')

router.get('/', async (req, res) => {
  try {
    const calls = await storageService.getCalls(parseInt(req.query.limit) || 50)
    res.json(calls)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch calls' })
  }
})

module.exports = router
