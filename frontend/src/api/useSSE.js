import { useEffect, useRef, useCallback } from 'react'

export function useSSE(onEvent) {
  const eventSourceRef = useRef(null)
  const cbRef = useRef(onEvent)
  cbRef.current = onEvent

  useEffect(() => {
    if (eventSourceRef.current) return

    const es = new EventSource('/events')
    eventSourceRef.current = es

    const handlers = ['connected', 'ack', 'state', 'telemetry', 'alarm', 'control_eval', 'health', 'maintenance', 'phase_transition', 'device_health', 'device_status_changed']
    handlers.forEach(type => {
      es.addEventListener(type, (e) => {
        try { cbRef.current(type, JSON.parse(e.data)) } catch {}
      })
    })

    es.onerror = () => {}

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [])

  const close = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  return close
}
