// AES-256-GCM encryption for patient PII at rest (PHIPA compliance).
// Requires ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
// Without the key, data is stored unencrypted — only acceptable in dev/simulation mode.
const crypto = require('crypto')
const ALGO = 'aes-256-gcm'
const PREFIX = 'enc:'

function getKey() {
  const k = process.env.ENCRYPTION_KEY
  if (!k || k.length < 64) return null
  return Buffer.from(k.slice(0, 64), 'hex')
}

function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') return plaintext
  const key = getKey()
  if (!key) return String(plaintext) // dev fallback — no encryption without key
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('hex')}.${enc.toString('hex')}.${tag.toString('hex')}`
}

function decrypt(ciphertext) {
  if (!ciphertext || !String(ciphertext).startsWith(PREFIX)) return ciphertext
  const key = getKey()
  if (!key) return '[encrypted — key missing]'
  try {
    const [ivHex, encHex, tagHex] = String(ciphertext).slice(PREFIX.length).split('.')
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8')
  } catch (_) { return '[decryption error]' }
}

// Generate a new key (run once, store in ENCRYPTION_KEY env var)
function generateKey() { return crypto.randomBytes(32).toString('hex') }

module.exports = { encrypt, decrypt, generateKey, isEnabled: () => !!getKey() }
