import { useState, useEffect } from 'react'

interface Config { clinicName: string; agentName: string; mode: string; storage: string }

const PERIODS = [
  { label: 'Last 7 days',  value: 7  },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

export default function DashboardHeader({ period, onPeriodChange }: {
  period: number
  onPeriodChange: (v: number) => void
}) {
  const [config, setConfig] = useState<Config | null>(null)
  const [now, setNow]       = useState(new Date())

  useEffect(() => {
    fetch('/api/config').then(r => r.ok ? r.json() : null).then(d => { if (d) setConfig(d) }).catch(() => {})
  }, [])
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const isLive    = config?.mode === 'live'
  const dateLabel = now.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const timeLabel = now.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  return (
    <div className="flex-shrink-0 bg-sx-surface border-b border-sx-border px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">

        {/* Left — title + clinic */}
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold text-sx-text tracking-tight">AI Recovery Dashboard</h1>
            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              isLive
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-sx-blue/10 border-sx-blue/20 text-sx-blue'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-sx-blue animate-pulse'}`} />
              {isLive ? 'LIVE' : 'SIMULATION'}
            </span>
          </div>
          <p className="text-xs text-sx-muted mt-0.5">{config?.clinicName || 'Northview Medical Centre'} · PHIPA Compliant · Canadian Data</p>
        </div>

        {/* Right — period selector + clock */}
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center bg-sx-dark border border-sx-border rounded-lg p-0.5 gap-0.5">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => onPeriodChange(p.value)}
                className={`px-3 py-1 rounded text-[11px] font-medium transition-all ${
                  period === p.value
                    ? 'bg-sx-blue text-white shadow-sm'
                    : 'text-sx-muted hover:text-sx-text'
                }`}
              >{p.label}</button>
            ))}
          </div>

          {/* Clock */}
          <div className="text-right pl-3 border-l border-sx-border">
            <p className="text-xs font-mono text-sx-text">{timeLabel}</p>
            <p className="text-[10px] text-sx-muted">{dateLabel}</p>
          </div>
        </div>
      </div>
    </div>
  )
}