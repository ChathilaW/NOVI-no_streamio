import { useCallback, useEffect, useState } from 'react'

interface GroupDistractionData {
  distractedCount: number
  totalCount: number
}

/**
 * useGroupDistraction
 *
 * Polls /api/meeting/[id]/distraction every second and returns
 * { distractedCount, totalCount } for the host's dashboard.
 */
const useGroupDistraction = (meetingId: string): GroupDistractionData => {
  const [data, setData] = useState<GroupDistractionData>({ distractedCount: 0, totalCount: 0 })

  const fetchData = useCallback(async () => {
    if (!meetingId) return
    try {
      const res = await fetch(`/api/meeting/${meetingId}/distraction`)
      const json = await res.json()
      setData({ distractedCount: json.distractedCount ?? 0, totalCount: json.totalCount ?? 0 })
    } catch {
      // ignore
    }
  }, [meetingId])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 200)
    return () => clearInterval(interval)
  }, [fetchData])

  return data
}

export default useGroupDistraction
