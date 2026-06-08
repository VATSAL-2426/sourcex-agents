const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

// Security headers (PHIPA requires reasonable access controls)
const securityHeaders = helmet({
  contentSecurityPolicy: false, // disabled — SSE + inline styles need flexibility
  crossOriginEmbedderPolicy: false,
})

// Rate limiting — prevents abuse and protects patient data endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,            // 120 req/min per IP (enough for SSE + normal use)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down.' },
})

// Tighter limit on write endpoints
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded on write endpoint.' },
})

// Strip sensitive headers from responses
function stripHeaders(req, res, next) {
  res.removeHeader('X-Powered-By')
  next()
}

module.exports = { securityHeaders, apiLimiter, writeLimiter, stripHeaders }
