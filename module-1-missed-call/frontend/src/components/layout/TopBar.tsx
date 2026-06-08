import React, { useState, useEffect } from 'react'

interface Config { clinicName: string; mode: string; encryption: boolean; storage: string }

export default function TopBar({ moduleName, showReports, onToggleReports }: {
  moduleName: string
  showReports: boolean
  onToggleReports: () => void
}) {
  const [now, setNow]       = useState(new Date())
  const [config, setConfig] = useState<Config | null>(null)

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => {
    fetch('/api/config').then(r => r.ok ? r.json() : null).then(d => { if (d) setConfig(d) }).catch(() => {})
  }, [])

  const time = now.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const date = now.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const clinicName = config?.clinicName || 'Northview Medical Centre'
  const isLive = config?.mode === 'live'

  return (
    <div className="h-14 flex items-center justify-between px-6 border-b border-sx-border bg-sx-surface flex-shrink-0">
      <div>
        <h1 className="text-sm font-semibold text-white">{moduleName}</h1>
        <p className="text-[11px] text-sx-muted">{clinicName}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Reports toggle */}
        <button
          onClick={onToggleReports}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition-all ${
            showReports
              ? 'bg-sx-blue/20 border-sx-blue/30 text-sx-blue'
              : 'bg-sx-dark border-sx-border text-sx-muted hover:text-white hover:border-sx-blue/20'
          }`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/>
          </svg>
          ROI Reports
        </button>

        {/* Mode badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-sx-dark border border-sx-border">
          <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-400' : 'bg-sx-blue animate-pulse'}`} />
          <span className="text-[10px] font-mono text-sx-muted">{isLive ? 'LIVE' : 'SIMULATION'}</span>
        </div>

        {/* Clock */}
        <div className="text-right">
          <p className="text-xs font-mono text-white">{time}</p>
          <p className="text-[10px] text-sx-muted">{date}</p>
        </div>
      </div>
    </div>
  )
}
