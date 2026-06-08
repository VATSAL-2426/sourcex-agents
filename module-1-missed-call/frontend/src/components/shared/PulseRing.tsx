import React from 'react'

export default function PulseRing({ active, children, size = 72 }: { active: boolean; children: React.ReactNode; size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {active && <div className="absolute inset-0 rounded-full bg-sx-blue/20 animate-ping" style={{ willChange: 'transform' }} />}
      <div className={`relative z-10 flex items-center justify-center rounded-full transition-all duration-500 ${active ? 'bg-sx-blue/20 border-2 border-sx-blue text-sx-blue' : 'bg-sx-surface border-2 border-sx-border text-sx-muted'}`} style={{ width: size - 16, height: size - 16 }}>
        {children}
      </div>
    </div>
  )
}
