import { useState, useEffect } from 'react'
import type { CallRecord } from '../types'
import { onSimComplete } from '../lib/simEvents'

export function useCallLogLocal() {
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [newestId, setNewestId] = useState<string | null>(null)

  useEffect(() => {
    return onSimComplete((record) => {
      setCalls(prev => [record, ...prev])
      setNewestId(record.id)
      setTimeout(() => setNewestId(null), 3000)
    })
  }, [])

  return { calls, loading: false, newestId }
}
