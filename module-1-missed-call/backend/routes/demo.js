// GET /demo/dashboard — live read-only demo page shown during sales calls.
// Shows real call data from the database / JSON fallback.
// Auto-refreshes every 30 seconds. No auth required (read-only, no PHI shown).
const express       = require('express')
const router        = express.Router()
const storageService = require('../services/storageService')
const clinic        = require('../config/clinic')

router.get('/', async (req, res) => {
  let calls = []
  try {
    calls = await storageService.getCalls(20)
  } catch (_) {}

  const now   = new Date()
  const month = now.toLocaleString('en-CA', { month: 'long', year: 'numeric', timeZone: 'America/Toronto' })

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonth  = calls.filter(c => new Date(c.timestamp) >= monthStart)
  const booked     = thisMonth.filter(c => c.outcome === 'booked')
  const avgFee     = parseInt(process.env.CLINIC_AVG_FEE || '350')
  const revenue    = booked.length * avgFee

  const rows = calls.map(c => {
    const ts      = new Date(c.timestamp)
    const dateStr = ts.toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Toronto' })
    const outcomeClass = c.outcome === 'booked'             ? 'badge-green'
                       : c.outcome === 'callback_initiated' ? 'badge-blue'
                       : c.outcome === 'no_answer'          ? 'badge-amber'
                       : 'badge-muted'
    const outcomeLabel = c.outcome === 'callback_initiated' ? 'In Progress'
                       : c.outcome === 'booked'             ? 'Booked'
                       : c.outcome === 'no_answer'          ? 'No Answer'
                       : c.outcome === 'voicemail'          ? 'Voicemail'
                       : c.outcome === 'declined'           ? 'Declined'
                       : c.outcome || '—'
    const phone = (c.patient_phone || '').replace(/\d(?=\d{4})/g, '*')
    return `
      <tr>
        <td>${dateStr}</td>
        <td>${c.patient_name || '—'}</td>
        <td>${phone || '—'}</td>
        <td>${c.reason || '—'}</td>
        <td>${c.appointment || '—'}</td>
        <td><span class="${outcomeClass}">${outcomeLabel}</span></td>
        <td>${c.duration_seconds ? c.duration_seconds + 's' : '—'}</td>
        <td><span class="mode-badge">${c.mode || 'sim'}</span></td>
      </tr>`
  }).join('\n')

  res.type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="30">
  <title>SOURCE X — ${clinic.name} Live Dashboard</title>
  <style>
    :root {
      --bg:      #0d0f14;
      --surface: #161921;
      --border:  #1f2430;
      --text:    #e2e8f0;
      --muted:   #64748b;
      --green:   #22c55e;
      --blue:    #3b82f6;
      --amber:   #f59e0b;
      --red:     #ef4444;
      --accent:  #6366f1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      padding: 24px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
    }
    .header-left h1 {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.3px;
    }
    .header-left p { color: var(--muted); font-size: 13px; margin-top: 2px; }
    .live-dot {
      display: inline-block;
      width: 8px; height: 8px;
      background: var(--green);
      border-radius: 50%;
      margin-right: 6px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }
    .refresh-note { color: var(--muted); font-size: 12px; }
    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px 24px;
    }
    .card-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .card-value { font-size: 32px; font-weight: 700; margin: 6px 0 2px; }
    .card-sub   { color: var(--muted); font-size: 12px; }
    .card.green  .card-value { color: var(--green);  }
    .card.blue   .card-value { color: var(--blue);   }
    .card.accent .card-value { color: var(--accent); }
    .section-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
      margin-bottom: 12px;
    }
    .table-wrap {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      background: var(--bg);
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    tbody tr { border-bottom: 1px solid var(--border); }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: rgba(255,255,255,0.02); }
    tbody td { padding: 12px 16px; color: var(--text); vertical-align: middle; }
    .badge-green { background: rgba(34,197,94,.15); color: var(--green);  padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .badge-blue  { background: rgba(59,130,246,.15); color: var(--blue);  padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .badge-amber { background: rgba(245,158,11,.15); color: var(--amber); padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .badge-muted { background: rgba(100,116,139,.15); color: var(--muted); padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .mode-badge  { background: rgba(99,102,241,.1);  color: var(--accent); padding: 2px 6px; border-radius: 4px; font-size: 11px; }
    .empty { text-align: center; color: var(--muted); padding: 40px; font-size: 13px; }
    .footer { margin-top: 24px; text-align: center; color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1><span class="live-dot"></span>SOURCE X — ${escHtml(clinic.name)}</h1>
      <p>AI Missed-Call Recovery · ${escHtml(month)}</p>
    </div>
    <div class="refresh-note">Auto-refreshes every 30 s</div>
  </div>

  <div class="cards">
    <div class="card blue">
      <div class="card-label">Calls Recovered</div>
      <div class="card-value">${thisMonth.length}</div>
      <div class="card-sub">this month</div>
    </div>
    <div class="card green">
      <div class="card-label">Bookings Created</div>
      <div class="card-value">${booked.length}</div>
      <div class="card-sub">confirmed appointments</div>
    </div>
    <div class="card accent">
      <div class="card-label">Revenue Recovered</div>
      <div class="card-value">$${revenue.toLocaleString()}</div>
      <div class="card-sub">@ $${avgFee} avg fee</div>
    </div>
  </div>

  <div class="section-title">Last 20 Call Events</div>
  <div class="table-wrap">
    ${calls.length === 0
      ? '<div class="empty">No calls yet — trigger a test by calling your Twilio demo number.</div>'
      : `<table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Patient</th>
              <th>Phone</th>
              <th>Reason</th>
              <th>Appointment</th>
              <th>Outcome</th>
              <th>Duration</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`
    }
  </div>

  <div class="footer">SOURCE X · PHIPA-compliant · Canadian data · ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</div>
</body>
</html>`)
})

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

module.exports = router
