import React from 'react'

export default function SpeedSlider({ speed, onChange, disabled }: { speed: number; onChange: (s: number) => void; disabled: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase mb-2">Demo Speed</p>
      <div className="flex rounded-lg overflow-hidden border border-sx-border">
        {[0.5, 1, 2].map(opt => (
          <button key={opt} onClick={() => !disabled && onChange(opt)} disabled={disabled}
            className={`flex-1 py-1.5 text-xs font-semibold transition-all ${speed === opt ? 'bg-sx-blue text-white' : 'bg-sx-dark text-sx-muted hover:text-white'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            {opt}×
          </button>
        ))}
      </div>
    </div>
  )
}
