import { useState, useEffect, useCallback } from 'react'
import type { SimState } from '../types'

export interface ReportSummary {
  totalHandled: number
  booked: number
  successRate: number
  estimatedRevenue: number
  avgDurationSeconds: number
}

export interface ModuleReport {
  label: string
  handled: number
  booked: number
  revenue: number
}

export interface TrendPoint { date: string; handled: number; booked: number }

export interface ReportData {
  period: { days: number }
  clinic: string
  avgFee: number
  summary: ReportSummary
  byModule: Record<string, ModuleReport>
  byOutcome: Record<string, number>
  trend: TrendPoint[]
}

export function useReports(currentSimState?: SimState) {
  const [data, setData]       = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [period, setPeriod]   = useState(30)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?period=${period}`)
      if (res.ok) setData(await res.json())
    } catch (_) {} finally { setLoading(false) }
  }, [period])

  // Initial fetch + refetch when period changes
  useEffect(() => { refetch() }, [refetch])

  // Auto-poll every 30 seconds so live calls update the dashboard
  useEffect(() => {
    const id = setInterval(refetch, 30000)
    return () => clearInterval(id)
  }, [refetch])

  // Refresh 1.5 s after a simulation completes (gives the DB time to write)
  useEffect(() => {
    if (currentSimState !== 'complete') return
    const t = setTimeout(refetch, 1500)
    return () => clearTimeout(t)
  }, [currentSimState, refetch])

  return { data, loading, period, setPeriod, refetch }
}