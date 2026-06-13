const express = require('express')
const router  = express.Router()
const storageService = require('../services/storageService')
const clinic = require('../config/clinic')

const PATIENTS = [
  { name: 'Sarah Mitchell',  phone: '+14165550194', reason: 'Physiotherapy follow-up'      },
  { name: 'James Okafor',   phone: '+16475550382', reason: 'Chiropractic adjustment'       },
  { name: 'Maria Santos',   phone: '+16475550211', reason: 'Massage therapy'               },
  { name: 'David Kim',      phone: '+19055550334', reason: 'Shoulder rehabilitation'       },
  { name: 'Linda Patel',    phone: '+14165550478', reason: 'Lower back pain treatment'     },
  { name: 'Robert Chen',    phone: '+16475550562', reason: 'Sports injury recovery'        },
  { name: 'Anna Kowalski',  phone: '+19055550693', reason: 'Post-surgery physiotherapy'    },
  { name: 'Kevin Tran',     phone: '+16475550291', reason: 'Knee assessment'               },
  { name: 'Emily Brown',    phone: '+14165550887', reason: 'Neck and shoulder tension'     },
  { name: 'Michael Zhang',  phone: '+19055550441', reason: 'Wrist injury follow-up'       },
  { name: 'Priya Sharma',   phone: '+16475550173', reason: 'Ankle sprain recovery'        },
  { name: 'Tom Nguyen',     phone: '+19055550628', reason: 'Hip replacement physio'        },
]

// ~65% booked, 18% no_answer, 10% voicemail, 7% callback_requested
const OUTCOMES = [
  'booked','booked','booked','booked','booked','booked','booked',
  'no_answer','no_answer',
  'voicemail',
  'callback_requested',
]

const SLOTS = [
  'Mon 9:00 AM', 'Mon 11:00 AM', 'Mon 2:00 PM', 'Mon 4:00 PM',
  'Tue 9:30 AM', 'Tue 11:30 AM', 'Tue 1:30 PM', 'Tue 3:30 PM',
  'Wed 10:00 AM', 'Wed 12:00 PM', 'Wed 2:30 PM', 'Wed 4:30 PM',
  'Thu 9:00 AM',  'Thu 11:00 AM', 'Thu 2:00 PM', 'Thu 4:00 PM',
  'Fri 9:30 AM',  'Fri 11:30 AM', 'Fri 1:00 PM', 'Fri 3:30 PM',
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min, max) { return min + Math.floor(Math.random() * (max - min)) }

router.post('/', async (req, res) => {
  try {
    const days  = Math.min(parseInt(req.body?.days) || 30, 90)
    const now   = Date.now()
    const records = []
    let counter   = 0

    for (let d = days - 1; d >= 0; d--) {
      // Upward trend: recent days get more calls
      const base = d < 7 ? 6 : d < 14 ? 5 : d < 21 ? 4 : 3
      const callsToday = base + randInt(0, 3)

      for (let c = 0; c < callsToday; c++) {
        const patient  = PATIENTS[counter % PATIENTS.length]
        const outcome  = pick(OUTCOMES)
        // Random time 8 AM – 5 PM
        const offsetMs = randInt(8 * 3600, 17 * 3600) * 1000
        const ts       = new Date(now - d * 86400000 + offsetMs)

        records.push({
          id:               `seed_${now}_${counter++}`,
          timestamp:        ts.toISOString(),
          patient_name:     patient.name,
          patient_phone:    patient.phone,
          reason:           patient.reason,
          outcome,
          appointment:      outcome === 'booked' ? pick(SLOTS) : null,
          provider:         clinic.primaryProvider,
          duration_seconds: outcome === 'booked' ? randInt(150, 300) : randInt(20, 60),
          mode:             'simulation',
          module:           1,
          module_label:     'Missed Call Recovery',
        })
      }
    }

    for (const record of records) {
      await storageService.saveCall(record)
    }

    console.log(`[Seed] Inserted ${records.length} demo records (${days} days)`)
    res.json({ ok: true, seeded: records.length, days })
  } catch (err) {
    console.error('[Seed]', err.message)
    res.status(500).json({ error: 'Seed failed', detail: err.message })
  }
})

module.exports = router