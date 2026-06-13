import { useState } from 'react'
import type { ModuleId } from './types'
import Sidebar from './components/layout/Sidebar'
import DashboardHeader from './components/dashboard/DashboardHeader'
import StatCards from './components/dashboard/StatCards'
import TrendChart from './components/dashboard/TrendChart'
import OutcomesPanel from './components/dashboard/OutcomesPanel'
import LivePanel from './components/dashboard/LivePanel'
import CallLogTable from './components/shared/CallLogTable'
import { useSimulation } from './hooks/useSimulation'
import { useCallLog } from './hooks/useCallLog'
import { useReports } from './hooks/useReports'

export default function App() {
  const [currentModule] = useState<ModuleId>(1)
  const sim = useSimulation()
  const { calls, loading, newestId, refetch: refetchCalls } = useCallLog(sim.currentState)
  const { data: report, period, setPeriod, refetch: refetchReports } = useReports(sim.currentState)

  const seedDemoData = async () => {
    await fetch('/api/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: 30 }),
    })
    await refetchReports()
    await refetchCalls()
  }

  const hasData = (report?.summary?.totalHandled ?? 0) > 0

  return (
    <div className="flex h-screen bg-sx-dark text-sx-text overflow-hidden">
      <Sidebar currentModule={currentModule} onModuleChange={() => {}} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <DashboardHeader period={period} onPeriodChange={setPeriod} hasData={hasData} onSeedData={seedDemoData} />
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-sx-dark px-6 py-5 space-y-5">

          {/* Stat Cards */}
          <StatCards report={report} calls={calls} />

          {/* Mid Row */}
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-8">
              <TrendChart trend={report?.trend ?? []} period={period} />
            </div>
            <div className="col-span-4 flex flex-col gap-5">
              <OutcomesPanel byOutcome={report?.byOutcome ?? {}} />
              <LivePanel
                state={sim.currentState}
                label={sim.label}
                isRunning={sim.isRunning}
                speed={sim.speed}
                startedAt={sim.startedAt}
                onSpeedChange={sim.setSpeed}
                onSimulate={() => sim.triggerSimulation(sim.speed, 1)}
              />
            </div>
          </div>

          {/* Call Log */}
          <CallLogTable calls={calls} loading={loading} newestId={newestId} />

        </main>
      </div>
    </div>
  )
}