// PHIPA audit logging — records all access to and mutations of patient data.
// Writes to audit_log DB table (when PostgreSQL is active) and appends to audit.log file.
const fs   = require('fs')
const path = require('path')
const LOG_FILE = path.join(__dirname, '../data/audit.log')

let _pool = null
function setPool(pool) { _pool = pool }

async function log(action, details = {}) {
  const entry = { timestamp: new Date().toISOString(), action, ...details }

  // File log — always, cheap and reliable
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8') } catch (_) {}

  // DB log — when PostgreSQL is connected
  if (_pool) {
    try {
      await _pool.query(
        `INSERT INTO audit_log (action, resource, resource_id, ip_address, details)
         VALUES ($1,$2,$3,$4,$5)`,
        [action, details.resource || null, details.resourceId || null,
         details.ip || null, JSON.stringify(details)]
      )
    } catch (_) {}
  }
}

const audit = {
  callSaved:     (callId, module, outcome, ip)  => log('call_saved',      { resource: 'call',   resourceId: callId, module, outcome, ip }),
  callsRead:     (limit, ip)                    => log('calls_read',      { resource: 'calls',  limit, ip }),
  reportRead:    (period, ip)                   => log('report_read',     { resource: 'report', period, ip }),
  configRead:    (ip)                           => log('config_read',     { resource: 'config', ip }),
  callCompleted: (vapiCallId, clinicId, outcome) => log('call_completed', { resource: 'call',   resourceId: vapiCallId, clinicId, outcome }),
  setPool,
}

module.exports = audit
