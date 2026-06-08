const fs   = require('fs')
const path = require('path')
const { encrypt, decrypt } = require('./encryptionService')
const audit = require('./auditService')

const DATA_DIR  = path.join(__dirname, '../data')
const DATA_FILE = path.join(DATA_DIR, 'calls.json')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

// ── PostgreSQL ─────────────────────────────────────────────────────────────────
let pool = null
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg')
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
  })
  audit.setPool(pool)
  pool.query(`
    -- Existing call log (used by dashboard + reports)
    CREATE TABLE IF NOT EXISTS call_records (
      id               VARCHAR PRIMARY KEY,
      timestamp        TIMESTAMPTZ NOT NULL,
      patient_name     TEXT,
      patient_phone    TEXT,
      reason           TEXT,
      outcome          VARCHAR(50),
      appointment      TEXT,
      provider         VARCHAR,
      duration_seconds INTEGER DEFAULT 0,
      vapi_call_id     VARCHAR,
      mode             VARCHAR(30) DEFAULT 'simulation',
      module           INTEGER,
      module_label     VARCHAR,
      clinic_id        VARCHAR DEFAULT 'default',
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_call_records_timestamp ON call_records (timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_call_records_module    ON call_records (module);

    -- PHIPA audit trail — one row per missed call, phone stored as SHA-256 hash only
    CREATE TABLE IF NOT EXISTS call_events (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinic_id           VARCHAR NOT NULL,
      patient_phone_hash  TEXT NOT NULL,
      missed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      callback_triggered_at TIMESTAMPTZ DEFAULT NOW(),
      callback_answered   BOOLEAN DEFAULT FALSE,
      booking_outcome     VARCHAR(20) CHECK (booking_outcome IN ('booked','declined','no_answer','voicemail')),
      call_duration_sec   INTEGER DEFAULT 0,
      vapi_call_id        VARCHAR,
      created_at          TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_call_events_clinic ON call_events (clinic_id, missed_at DESC);

    -- Confirmed bookings — tracks revenue recovered
    CREATE TABLE IF NOT EXISTS bookings_recovered (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinic_id           VARCHAR NOT NULL,
      call_event_id       UUID REFERENCES call_events(id),
      patient_name        TEXT,
      appointment_time    TEXT,
      reason              TEXT,
      estimated_revenue   NUMERIC,
      source              VARCHAR(30) DEFAULT 'missed_call' CHECK (source IN ('missed_call','no_show','reactivation')),
      created_at          TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_clinic ON bookings_recovered (clinic_id, created_at DESC);

    -- All outbound SMS events
    CREATE TABLE IF NOT EXISTS sms_events (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinic_id   VARCHAR NOT NULL,
      type        VARCHAR(30) CHECK (type IN ('front_desk_alert','no_show_recovery','review_request','reactivation')),
      status      VARCHAR(20) CHECK (status IN ('sent','delivered','failed')),
      twilio_sid  VARCHAR,
      sent_at     TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sms_events_clinic ON sms_events (clinic_id, sent_at DESC);

    -- PHIPA access audit log
    CREATE TABLE IF NOT EXISTS audit_log (
      id          SERIAL PRIMARY KEY,
      action      VARCHAR NOT NULL,
      resource    VARCHAR,
      resource_id VARCHAR,
      ip_address  VARCHAR,
      details     JSONB,
      timestamp   TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch(e => console.error('[DB] Init error:', e.message))
}

// ── Encryption helpers ─────────────────────────────────────────────────────────
function encryptRecord(r) {
  return { ...r, patient_name: encrypt(r.patient_name), patient_phone: encrypt(r.patient_phone) }
}
function decryptRecord(r) {
  if (!r) return r
  return { ...r, patient_name: decrypt(r.patient_name), patient_phone: decrypt(r.patient_phone) }
}

// ── JSON file helpers (dev fallback) ─────────────────────────────────────────
function loadJson() {
  if (!fs.existsSync(DATA_FILE)) return []
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) } catch (_) { return [] }
}
function writeJson(records) {
  const tmp = DATA_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(records, null, 2), 'utf8')
  fs.renameSync(tmp, DATA_FILE)
}

// ── Airtable (activates with AIRTABLE_* vars) ─────────────────────────────────
const isAirtable = () => !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID && process.env.AIRTABLE_TABLE_NAME)

async function airtableSave(record) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE_NAME)}`
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: {
      'Call ID': record.id, 'Timestamp': record.timestamp,
      'Patient Name': record.patient_name, 'Phone': record.patient_phone,
      'Reason': record.reason, 'Outcome': record.outcome,
      'Appointment': record.appointment, 'Provider': record.provider,
      'Duration (s)': record.duration_seconds, 'Mode': record.mode,
      'Module': record.module, 'Module Label': record.module_label,
    } }),
  })
}

async function airtableGet(limit) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE_NAME)}?maxRecords=${limit}&sort[0][field]=Timestamp&sort[0][direction]=desc`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } })
  if (!res.ok) return []
  const data = await res.json()
  return (data.records || []).map(r => r.fields)
}

// ── Public API ────────────────────────────────────────────────────────────────

async function saveCall(record) {
  const encrypted = encryptRecord(record)
  await audit.callSaved(record.id, record.module, record.outcome)

  if (pool) {
    await pool.query(
      `INSERT INTO call_records
         (id, timestamp, patient_name, patient_phone, reason, outcome, appointment,
          provider, duration_seconds, vapi_call_id, mode, module, module_label)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO NOTHING`,
      [encrypted.id, encrypted.timestamp, encrypted.patient_name, encrypted.patient_phone,
       encrypted.reason, encrypted.outcome, encrypted.appointment, encrypted.provider,
       encrypted.duration_seconds || 0, encrypted.vapi_call_id || null,
       encrypted.mode, encrypted.module, encrypted.module_label]
    )
    return
  }
  if (isAirtable()) { await airtableSave(record); return }

  const records = loadJson()
  records.unshift(encrypted)
  writeJson(records)
}

// Update outcome on an existing call_record (called by Vapi end-of-call-report)
async function updateCallOutcome(callRecordId, data) {
  const { patient_name, appointment, reason, outcome, duration_seconds, vapi_call_id } = data

  if (pool) {
    await pool.query(
      `UPDATE call_records
       SET patient_name=$1, appointment=$2, reason=$3, outcome=$4,
           duration_seconds=$5, vapi_call_id=$6
       WHERE id=$7`,
      [encrypt(patient_name), appointment, reason, outcome,
       duration_seconds || 0, vapi_call_id || null, callRecordId]
    )
    return
  }

  // JSON fallback
  const records = loadJson()
  const idx = records.findIndex(r => r.id === callRecordId)
  if (idx !== -1) {
    records[idx] = {
      ...records[idx],
      patient_name: encrypt(patient_name),
      appointment,
      reason,
      outcome,
      duration_seconds: duration_seconds || 0,
      vapi_call_id: vapi_call_id || null,
    }
    writeJson(records)
  }
}

async function getCalls(limit = 50) {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM call_records ORDER BY timestamp DESC LIMIT $1', [limit])
    return rows.map(decryptRecord)
  }
  if (isAirtable()) return airtableGet(limit)
  return loadJson().map(decryptRecord).slice(0, limit)
}

async function getReportData(days = 30) {
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  if (pool) {
    const { rows } = await pool.query(
      `SELECT outcome, module, module_label, duration_seconds, timestamp
       FROM call_records WHERE timestamp > $1 ORDER BY timestamp DESC`,
      [since]
    )
    return rows
  }
  const cutoff = new Date(since)
  return loadJson()
    .filter(r => new Date(r.timestamp) > cutoff)
    .map(({ outcome, module, module_label, duration_seconds, timestamp }) =>
      ({ outcome, module, module_label, duration_seconds, timestamp }))
}

// ── PHIPA tables (PostgreSQL only) ────────────────────────────────────────────

async function logCallEvent({ clinicId, patientPhoneHash, callbackAnswered, bookingOutcome, callDurationSec, vapiCallId }) {
  if (!pool) return null
  try {
    const { rows } = await pool.query(
      `INSERT INTO call_events
         (clinic_id, patient_phone_hash, callback_answered, booking_outcome, call_duration_sec, vapi_call_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [clinicId, patientPhoneHash, callbackAnswered, bookingOutcome, callDurationSec || 0, vapiCallId]
    )
    return rows[0]?.id || null
  } catch (err) {
    console.error('[DB] logCallEvent error:', err.message)
    return null
  }
}

async function logBooking({ clinicId, callEventId, patientName, preferredTime, reason, source = 'missed_call' }) {
  if (!pool) return
  const avgFee = parseInt(process.env.CLINIC_AVG_FEE || '350')
  try {
    await pool.query(
      `INSERT INTO bookings_recovered
         (clinic_id, call_event_id, patient_name, appointment_time, reason, estimated_revenue, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [clinicId, callEventId || null, patientName, preferredTime, reason, avgFee, source]
    )
  } catch (err) {
    console.error('[DB] logBooking error:', err.message)
  }
}

async function logSmsEvent({ clinicId, type, status, twilioSid }) {
  if (!pool) return
  try {
    await pool.query(
      `INSERT INTO sms_events (clinic_id, type, status, twilio_sid) VALUES ($1,$2,$3,$4)`,
      [clinicId, type, status, twilioSid || null]
    )
  } catch (err) {
    console.error('[DB] logSmsEvent error:', err.message)
  }
}

const isPostgres = () => !!pool
module.exports = {
  saveCall, updateCallOutcome, getCalls, getReportData,
  logCallEvent, logBooking, logSmsEvent,
  isPostgres, isAirtable,
}
