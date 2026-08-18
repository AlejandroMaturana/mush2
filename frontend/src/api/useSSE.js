import { useEffect, useRef, useCallback } from 'react'
import { getAccessToken } from '../shared/api/tokenStore'

const INITIAL_DELAY = 1000
const MAX_DELAY = 30000
const HEARTBEAT_TIMEOUT = 60000

const EVENT_TYPES = [
  'connected', 'ack', 'state', 'telemetry', 'alarm', 'control_eval',
  'health', 'maintenance', 'phase_transition', 'device_health', 'device_status_changed',
]

let singletonES = null
let subscribers = new Set()
let reconnectTimer = null
let reconnectDelay = INITIAL_DELAY
let lastEventId = null
let heartbeatTimer = null

function resetBackoff() {
  reconnectDelay = INITIAL_DELAY
}

function startHeartbeat() {
  clearTimeout(heartbeatTimer)
  heartbeatTimer = setTimeout(() => {
    if (singletonES) {
      singletonES.close()
      singletonES = null
    }
    scheduleReconnect()
  }, HEARTBEAT_TIMEOUT)
}

function dispatch(type, data) {
  startHeartbeat()
  for (const cb of subscribers) {
    try { cb(type, data) } catch { /* subscriber error must not crash dispatch */ }
  }
}

function createEventSource() {
  if (singletonES) return singletonES

  const url = new URL('/events', window.location.origin)
  if (lastEventId) {
    url.searchParams.set('lastEventId', lastEventId)
  }

  const es = new EventSource(url.pathname + url.search)
  singletonES = es

  EVENT_TYPES.forEach(type => {
    es.addEventListener(type, (e) => {
      lastEventId = e.lastEventId || lastEventId
      try {
        dispatch(type, JSON.parse(e.data))
      } catch {}
    })
  })

  es.onerror = () => {
    es.close()
    singletonES = null
    clearTimeout(heartbeatTimer)
    scheduleReconnect()
  }

  resetBackoff()
  startHeartbeat()
  return es
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    if (subscribers.size > 0 && !singletonES) {
      createEventSource()
    }
  }, reconnectDelay)
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY)
}

function ensureConnected() {
  if (!singletonES && subscribers.size > 0) {
    createEventSource()
  }
}

function disconnect() {
  clearTimeout(reconnectTimer)
  clearTimeout(heartbeatTimer)
  reconnectTimer = null
  heartbeatTimer = null
  if (singletonES) {
    singletonES.close()
    singletonES = null
  }
  resetBackoff()
}

export function useSSE(onEvent) {
  const cbRef = useRef(onEvent)
  cbRef.current = onEvent

  useEffect(() => {
    const handler = (type, data) => cbRef.current(type, data)
    subscribers.add(handler)
    ensureConnected()

    return () => {
      subscribers.delete(handler)
      if (subscribers.size === 0) {
        disconnect()
      }
    }
  }, [])

  const close = useCallback(() => {
    disconnect()
    subscribers.clear()
  }, [])

  return close
}
