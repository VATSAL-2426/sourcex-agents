import { useState, useEffect, useRef, useCallback } from 'react'
import type { SimState, SimEvent, ActivityEntry, TranscriptLine, Patient, StateColor, ModuleId, CampaignPatient } from '../types'

export function useSimulation() {
  const [currentState, setCurrentState] = useState<SimState>('idle')
  const [label, setLabel] = useState('System Ready')
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)
  const [campaignPatients, setCampaignPatients] = useState<CampaignPatient[]>([])
  const [campaignRevenue, setCampaignRevenue] = useState(0)
  const [speed, setSpeed] = useState<number>(1)
  const [isRunning, setIsRunning] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const handleEvent = useCallback((event: SimEvent) => {
    if (event.type === 'init' || event.type === 'state_change') {
      setCurrentState(event.state)
      setLabel(event.label)
      if (event.patient) setPatient(event.patient)
      if (event.patient === null) setPatient(null)
      setIsRunning(event.state !== 'idle' && event.state !== 'complete')

      // Reset activity/transcript on first active state
      if (event.state === 'missed_call' || event.state === 'no_show_detected' || event.state === 'campaign_start') {
        setStartedAt(Date.now())
        setActivity([])
        setTranscript([])
        setCampaignPatients([])
        setCampaignRevenue(0)
      }

      if (event.state !== 'idle') {
        setActivity(prev => [...prev, {
          id: `${event.state}_${event.timestamp}`,
          state: event.state,
          label: event.label,
          color: (event.color ?? 'muted') as StateColor,
          timestamp: event.timestamp,
        }])
      }
    }

    if (event.type === 'transcript_line' && event.transcriptLine) {
      setTranscript(prev => [...prev, event.transcriptLine!])
    }

    if (event.type === 'campaign_update') {
      if (event.patients) setCampaignPatients(event.patients)
      if (event.revenue !== undefined) setCampaignRevenue(event.revenue)
    }

    if (event.type === 'complete') {
      setIsRunning(false)
      setStartedAt(null)
    }
  }, [])

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>
    const connect = () => {
      const es = new EventSource('/api/events')
      esRef.current = es
      es.onmessage = (e) => { try { handleEvent(JSON.parse(e.data)) } catch (_) {} }
      es.onerror = () => { es.close(); retryTimeout = setTimeout(connect, 2000) }
    }
    connect()
    return () => { esRef.current?.close(); clearTimeout(retryTimeout) }
  }, [handleEvent])

  const triggerSimulation = useCallback(async (s: number, moduleId: ModuleId) => {
    await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed: s, moduleId }),
    })
  }, [])

  const resetSimulation = useCallback(async () => {
    await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed: 1, moduleId: 1, resetOnly: true }),
    })
    setCurrentState('idle')
    setLabel('System Ready')
    setActivity([])
    setTranscript([])
    setPatient(null)
    setCampaignPatients([])
    setCampaignRevenue(0)
    setIsRunning(false)
    setStartedAt(null)
  }, [])

  return {
    currentState, label, activity, transcript,
    patient, campaignPatients, campaignRevenue,
    speed, setSpeed, isRunning, startedAt,
    triggerSimulation, resetSimulation,
  }
}
