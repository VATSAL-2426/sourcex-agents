import { useState, useEffect, useCallback } from 'react'
import type { SimState, CallRecord } from '../types'

export function useCallLog(currentState: SimState) {
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [newestId, setNewestId] = useState<string | null>(null)

  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch('/api/calls')
      const data: CallRecord[] = await res.json()
      setCalls(prev => {
        if (data.length > 0 && data[0].id !== prev[0]?.id) {
          setNewestId(data[0].id)
          setTimeout(() => setNewestId(null), 3000)
        }
        return data
      })
    } catch (_) {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCalls() }, [fetchCalls])
  useEffect(() => {
    if (currentState === 'complete') { const t = setTimeout(fetchCalls, 1200); return () => clearTimeout(t) }
  }, [currentState, fetchCalls])

  return { calls, loading, newestId, refetch: fetchCalls }
}
