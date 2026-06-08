import { useState, useEffect, useCallback } from 'react'

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

export function useReports() {
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

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, period, setPeriod, refetch }
}
