import React, { useState } from 'react'
import type { ModuleId } from './types'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import LiveStatusPanel from './components/panels/LiveStatusPanel'
import ActivityFeedPanel from './components/panels/ActivityFeedPanel'
import PatientRecordPanel from './components/panels/PatientRecordPanel'
import CampaignPanel from './components/panels/CampaignPanel'
import FaxPanel from './components/panels/FaxPanel'
import WaitlistPanel from './components/panels/WaitlistPanel'
import ReviewPanel from './components/panels/ReviewPanel'
import InsurancePanel from './components/panels/InsurancePanel'
import CallLogTable from './components/shared/CallLogTable'
import { useSimulationLocal } from './hooks/useSimulationLocal'
import { useCallLogLocal } from './hooks/useCallLogLocal'

const MODULE_NAMES: Record<ModuleId, string> = {
  1: 'Missed Call Recovery', 2: 'No-Show Recovery', 3: 'Patient Reactivation',
  4: 'Fax Automation', 5: 'Waitlist Management', 6: 'Review Generation', 7: 'Insurance Follow-up',
}

export default function AppStandalone() {
  const [currentModule, setCurrentModule] = useState<ModuleId>(1)
  const sim = useSimulationLocal()
  const { calls, loading, newestId } = useCallLogLocal()

  const handleModuleChange = async (moduleId: ModuleId) => {
    if (moduleId === currentModule) return
    await sim.resetSimulation()
    setCurrentModule(moduleId)
  }

  const renderRightPanel = () => {
    switch (currentModule) {
      case 3: return <CampaignPanel patients={sim.campaignPatients} revenue={sim.campaignRevenue} state={sim.currentState} />
      case 4: return <FaxPanel state={sim.currentState} />
      case 5: return <WaitlistPanel state={sim.currentState} />
      case 6: return <ReviewPanel state={sim.currentState} />
      case 7: return <InsurancePanel state={sim.currentState} />
      default: return <PatientRecordPanel patient={sim.patient} transcript={sim.transcript} state={sim.currentState} moduleId={currentModule as 1 | 2} />
    }
  }

  return (
    <div className="flex h-screen bg-sx-dark text-white overflow-hidden">
      <Sidebar currentModule={currentModule} onModuleChange={handleModuleChange} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar moduleName={MODULE_NAMES[currentModule]} showReports={false} onToggleReports={() => {}} />
        <main className="flex-1 overflow-hidden p-4 flex flex-col gap-4 min-h-0">
          <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
            <LiveStatusPanel
              state={sim.currentState} label={sim.label} isRunning={sim.isRunning}
              speed={sim.speed} startedAt={sim.startedAt} moduleId={currentModule}
              onSpeedChange={sim.setSpeed}
              onSimulate={() => sim.triggerSimulation(sim.speed, currentModule)}
            />
            <ActivityFeedPanel activity={sim.activity} />
            {renderRightPanel()}
          </div>
          <div className="h-52 flex-shrink-0">
            <CallLogTable calls={calls} loading={loading} newestId={newestId} />
          </div>
        </main>
      </div>
    </div>
  )
}
