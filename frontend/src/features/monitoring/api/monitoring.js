import client from '../../../shared/api/axiosInstance'

export async function getMetrics() {
  const { data } = await client.get('/monitoring/metrics')
  return data
}

export async function getHealthDb() {
  const { data } = await client.get('/monitoring/health/db')
  return data
}

export async function getDeviceHealth(deviceId) {
  const { data } = await client.get(`/devices/${deviceId}/health`)
  return data
}

export async function getLogs({ level, module, limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams()
  if (level) params.set('level', level)
  if (module) params.set('module', module)
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  const { data } = await client.get(`/monitoring/logs?${params}`)
  return data
}
