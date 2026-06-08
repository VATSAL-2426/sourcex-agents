import type { ModuleId } from '../../types'

const MODULES: { id: ModuleId; name: string; description: string; live: boolean }[] = [
  { id: 1, name: 'Missed Call Recovery', description: 'AI callback within 60 seconds', live: true  },
  { id: 2, name: 'No-Show Recovery',     description: 'Automated rebooking sequences', live: false },
  { id: 3, name: 'Patient Reactivation', description: 'Re-engage dormant patients',    live: false },
  { id: 4, name: 'Fax Automation',       description: 'Read, classify, route faxes',   live: false },
  { id: 5, name: 'Waitlist Management',  description: 'Fill cancelled slots instantly', live: false },
  { id: 6, name: 'Review Generation',    description: 'Post-visit Google reviews',      live: false },
  { id: 7, name: 'Insurance Follow-up',  description: 'Chase unpaid claims',            live: false },
]

export default function Sidebar({ currentModule, onModuleChange }: {
  currentModule: ModuleId
  onModuleChange: (id: ModuleId) => void
}) {
  return (
    <div className="w-60 flex-shrink-0 bg-sx-surface border-r border-sx-border flex flex-col">
      <div className="h-14 flex items-center px-5 border-b border-sx-border flex-shrink-0">
        <img src="/sourcex-logo.png" alt="SOURCE X" className="h-6 object-contain"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement
            el.style.display = 'none'
            const s = document.createElement('span')
            s.className = 'text-white font-bold text-base tracking-tight'
            s.textContent = 'SOURCE X'
            el.parentElement!.appendChild(s)
          }} />
      </div>

      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <p className="text-[9px] font-semibold tracking-widest text-sx-muted uppercase">AI Operating System</p>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1 pb-3">
        {MODULES.map((mod) => {
          const isSelected = mod.id === currentModule
          return (
            <div
              key={mod.id}
              onClick={() => mod.live && onModuleChange(mod.id)}
              className={`relative flex items-start px-3 py-2.5 rounded-lg border transition-all
                ${mod.live
                  ? 'cursor-pointer'
                  : 'cursor-not-allowed opacity-40'
                }
                ${isSelected && mod.live
                  ? 'bg-sx-blue/10 border-sx-blue/20'
                  : 'border-transparent hover:bg-white/[0.03]'
                }`}
            >
              {isSelected && mod.live && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sx-blue rounded-full" />
              )}
              <div className="min-w-0 w-full">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold tracking-widest text-sx-muted">
                    {String(mod.id).padStart(2, '0')}
                  </span>
                  <span className={`text-xs font-medium truncate ${isSelected && mod.live ? 'text-white' : 'text-sx-muted'}`}>
                    {mod.name}
                  </span>
                  {!mod.live && (
                    <span className="ml-auto flex-shrink-0 text-[8px] font-semibold uppercase tracking-wider text-sx-muted border border-sx-border rounded px-1 py-0.5">
                      Soon
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-sx-muted mt-0.5 pl-6">{mod.description}</p>
              </div>
            </div>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-sx-border flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-sx-muted">PHIPA Compliant</span>
        </div>
        <p className="text-[9px] text-sx-border font-mono">v1.0 — Live</p>
      </div>
    </div>
  )
}
