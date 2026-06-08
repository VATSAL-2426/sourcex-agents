import React from 'react'
import type { SimState } from '../../types'

const STAGES: SimState[] = ['visit_completed', 'delay_window', 'sending_sms', 'sms_delivered', 'response_received', 'review_requested', 'review_posted', 'complete']

const PATIENT = {
  name: 'Maria Santos',
  phone: '+1 (647) 555-0217',
  visit: 'Physiotherapy Follow-up',
  provider: 'Dr. Anand Mehta',
  date: 'May 12, 2026',
}

const SMS_TEXT = `Hi Maria! Thank you for visiting Northview Medical Centre today. We hope your session with Dr. Mehta was helpful. We'd love to hear your feedback — it takes just 30 seconds. Tap below to leave a Google review:`

const REVIEW_TEXT = `Amazing experience at Northview Medical Centre! Dr. Mehta was incredibly thorough and the whole team was so welcoming. My recovery is on track and I couldn't be happier. Highly recommend to anyone looking for top-quality physiotherapy care in North York. ⭐⭐⭐⭐⭐`

function StarRating({ filled }: { filled: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <svg key={n} width="14" height="14" viewBox="0 0 24 24"
          fill={n <= filled ? '#FACC15' : 'none'}
          stroke={n <= filled ? '#FACC15' : '#334155'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  )
}

export default function ReviewPanel({ state }: { state: SimState }) {
  const activeIdx = STAGES.indexOf(state)
  const hasVisit = activeIdx >= 0 && state !== 'idle'
  const smsSent = activeIdx >= STAGES.indexOf('sending_sms')
  const smsDelivered = activeIdx >= STAGES.indexOf('sms_delivered')
  const responded = activeIdx >= STAGES.indexOf('response_received')
  const requested = activeIdx >= STAGES.indexOf('review_requested')
  const posted = activeIdx >= STAGES.indexOf('review_posted') || state === 'complete'

  const starCount = posted ? 5 : requested ? 4 : responded ? 3 : smsDelivered ? 2 : smsSent ? 1 : 0

  return (
    <div className="bg-sx-panel border border-sx-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-sx-border flex-shrink-0">
        <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">Module 06</p>
        <h2 className="text-sm font-semibold text-white mt-0.5">Review Generation</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4 min-h-0">

        {/* Patient + visit */}
        <div className={`rounded-lg border p-3 transition-all duration-500 ${hasVisit ? 'border-sx-border bg-sx-surface' : 'border-sx-border/40 bg-sx-surface/40'}`}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className={`text-xs font-semibold transition-colors ${hasVisit ? 'text-white' : 'text-sx-muted'}`}>{PATIENT.name}</p>
            <span className={`text-[9px] font-mono transition-colors ${hasVisit ? 'text-sx-muted' : 'text-sx-border'}`}>{PATIENT.date}</span>
          </div>
          <p className="text-[10px] text-sx-muted">{PATIENT.visit} · {PATIENT.provider}</p>
          <p className={`text-[10px] font-mono transition-colors ${hasVisit ? 'text-sx-muted' : 'text-sx-border'}`}>{PATIENT.phone}</p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-3">
          <StarRating filled={starCount} />
          <span className={`text-[10px] transition-colors ${starCount > 0 ? 'text-sx-muted' : 'text-sx-border'}`}>
            {posted ? '5 stars · Google Review' : starCount > 0 ? `${starCount} / 5 — building...` : 'Awaiting response'}
          </span>
        </div>

        {/* SMS preview */}
        <div className={`rounded-lg border p-3 transition-all duration-500 ${smsSent ? 'border-sx-border bg-sx-surface' : 'border-sx-border/20 bg-sx-surface/20 opacity-40'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">SMS Message</p>
            {smsDelivered && (
              <span className="inline-flex items-center gap-1 text-[9px] text-green-400">
                <div className="w-1 h-1 rounded-full bg-green-400" /> Delivered
              </span>
            )}
          </div>
          <p className="text-[10px] text-sx-muted leading-relaxed">{SMS_TEXT}</p>
          {smsSent && (
            <div className="mt-2 pt-2 border-t border-sx-border">
              <p className="text-[10px] font-mono text-sx-blue">https://g.page/r/northview ↗</p>
            </div>
          )}
        </div>

        {/* Google review card */}
        {posted && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sx-blue/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-sx-blue">MS</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{PATIENT.name}</p>
                <StarRating filled={5} />
              </div>
              <div className="ml-auto flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
            </div>
            <p className="text-[10px] text-sx-muted leading-relaxed">{REVIEW_TEXT}</p>
          </div>
        )}
      </div>
    </div>
  )
}
