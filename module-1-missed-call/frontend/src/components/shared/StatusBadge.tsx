import React from 'react'
import type { OutcomeType } from '../../types'

type ModeType = 'simulation' | 'live' | 'simulation_fallback'
type BadgeVariant = OutcomeType | ModeType

const STYLES: Record<BadgeVariant, string> = {
  booked:               'bg-green-500/15 text-green-400 border-green-500/20',
  callback_scheduled:   'bg-sx-blue/15 text-sx-blue border-sx-blue/20',
  no_answer:            'bg-amber-500/15 text-amber-400 border-amber-500/20',
  failed:               'bg-red-500/15 text-red-400 border-red-500/20',
  processed:            'bg-purple-500/15 text-purple-400 border-purple-500/20',
  filled:               'bg-green-500/15 text-green-400 border-green-500/20',
  review_posted:        'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  escalated:            'bg-orange-500/15 text-orange-400 border-orange-500/20',
  simulation:           'bg-sx-border/40 text-sx-muted border-sx-border',
  live:                 'bg-sx-blue/15 text-sx-blue border-sx-blue/20',
  simulation_fallback:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
}

const LABELS: Record<BadgeVariant, string> = {
  booked:               'Booked',
  callback_scheduled:   'Callback',
  no_answer:            'No Answer',
  failed:               'Failed',
  processed:            'Processed',
  filled:               'Filled',
  review_posted:        '5★ Review',
  escalated:            'Escalated',
  simulation:           'SIM',
  live:                 'LIVE',
  simulation_fallback:  'FALLBACK',
}

export default function StatusBadge({ variant }: { variant: BadgeVariant }) {
  const style = STYLES[variant] ?? 'bg-sx-border/40 text-sx-muted border-sx-border'
  const label = LABELS[variant] ?? variant
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide border ${style}`}>
      {label}
    </span>
  )
}
