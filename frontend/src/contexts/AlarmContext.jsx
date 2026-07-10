import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAlarmStats } from '../api/client.js'
import { useSSE } from '../api/useSSE.js'

const AlarmContext = createContext(null)

export function AlarmProvider({ children }) {
  const [stats, setStats] = useState({ critical: 0, high: 0, medium: 0, low: 0, total: 0 })

  useEffect(() => {
    getAlarmStats()
      .then(data => setStats(data))
      .catch(() => {})
  }, [])

  useSSE(useCallback((type, data) => {
    if (type === 'alarm') {
      if (data.resolvedAt) {
        setStats(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          [data.severity?.toLowerCase()]: Math.max(0, prev[data.severity?.toLowerCase()] - 1),
        }))
      } else {
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          [data.severity?.toLowerCase()]: (prev[data.severity?.toLowerCase()] || 0) + 1,
        }))
      }
    }
  }, []))

  return (
    <AlarmContext.Provider value={stats}>
      {children}
    </AlarmContext.Provider>
  )
}

export function useAlarms() {
  const ctx = useContext(AlarmContext)
  if (!ctx) throw new Error('useAlarms must be used within AlarmProvider')
  return ctx
}

export default AlarmContext
