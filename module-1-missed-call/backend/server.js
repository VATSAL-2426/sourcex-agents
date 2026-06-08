require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const express = require('express')
const cors    = require('cors')
const path    = require('path')
const clinic  = require('./config/clinic')
const { securityHeaders, apiLimiter, writeLimiter, stripHeaders } = require('./middleware/security')
const { isEnabled: encryptionEnabled } = require('./services/encryptionService')

const app    = express()
const PORT   = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'

// ── Security ──────────────────────────────────────────────────────────────────
app.use(securityHeaders)
app.use(stripHeaders)
app.set('trust proxy', 1)

// ── SSE route BEFORE json middleware ──────────────────────────────────────────
app.use('/api/events', require('./routes/events'))

// ── CORS ──────────────────────────────────────────────────────────────────────
if (!isProd) {
  app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
}

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))  // Vapi end-of-call-report payloads can be large
app.use(express.urlencoded({ extended: false, limit: '10mb' }))

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/', apiLimiter)
app.use('/api/simulate', writeLimiter)

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/simulate', require('./routes/simulate'))
app.use('/api/calls',    require('./routes/calls'))
app.use('/api/reports',  require('./routes/reports'))
app.use('/api/retell',   require('./routes/webhook'))   // kept for simulation compat
app.use('/api/twilio',   require('./routes/twilio'))
app.use('/api/vapi',     require('./routes/vapi'))       // real Vapi webhook events
app.use('/demo',         require('./routes/demo'))       // live demo dashboard

// ── Public clinic config ───────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  const vapiService   = require('./services/vapiService')
  const storageService = require('./services/storageService')
  res.json({
    clinicName:      clinic.name,
    agentName:       clinic.agentName,
    primaryProvider: clinic.primaryProvider,
    timezone:        clinic.timezone,
    mode:            vapiService.isLive() ? 'live' : 'simulation',
    encryption:      encryptionEnabled(),
    storage:         storageService.isPostgres() ? 'postgresql'
                     : storageService.isAirtable() ? 'airtable'
                     : 'json',
  })
})

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() })
})

// ── Static (production) ───────────────────────────────────────────────────────
if (isProd) {
  // Try backend/public first (local dev builds), fall back to frontend/dist (Railway nixpacks builds)
  const distPublic   = path.join(__dirname, 'public')
  const distFrontend = path.join(__dirname, '..', 'frontend', 'dist')
  const fs = require('fs')
  const dist = fs.existsSync(path.join(distPublic, 'index.html')) ? distPublic : distFrontend
  app.use(express.static(dist))
  app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html')))
}

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

// ── Start ─────────────────────────────────────────────────────────────────────
const storage    = require('./services/storageService')
const vapiSvc    = require('./services/vapiService')
app.listen(PORT, () => {
  console.log('')
  console.log('  SOURCE X — AI Operating System')
  console.log('  ────────────────────────────────────────────')
  console.log(`  Clinic    : ${clinic.name}`)
  console.log(`  Agent     : ${clinic.agentName}`)
  console.log(`  API       : http://localhost:${PORT}`)
  console.log(`  Demo      : http://localhost:${PORT}/demo/`)
  console.log(`  Mode      : ${vapiSvc.isLive() ? '🟢 LIVE (Vapi)' : '🔵 SIMULATION'}`)
  console.log(`  Storage   : ${storage.isPostgres() ? 'PostgreSQL' : storage.isAirtable() ? 'Airtable' : 'JSON file'}`)
  console.log(`  Encryption: ${encryptionEnabled() ? '🔒 ON' : '⚠️  OFF (set ENCRYPTION_KEY for PHIPA)'}`)
  console.log('')
})
