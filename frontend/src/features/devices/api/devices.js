import client from '../../../shared/api/axiosInstance'

export async function getDevices() {
  const { data } = await client.get('/devices')
  return data.data ?? data
}

export async function getDashboardSummary() {
  // D1/T9: una sola petición devuelve estado D2 + última telemetría por cámara,
  // eliminando el N+1 de getLatestTelemetry() por dispositivo.
  const { data } = await client.get('/dashboard/summary')
  return data.data ?? data
}

export async function getDevice(id) {
  const { data } = await client.get(`/devices/${id}`)
  return data
}

export async function createDevice(payload) {
  const { data } = await client.post('/devices', payload)
  return data
}

export async function updateDevice(id, payload) {
  const { data } = await client.patch(`/devices/${id}`, payload)
  return data
}

export async function getActuators(deviceId) {
  const { data } = await client.get(`/devices/${deviceId}/actuators`)
  return data.data ?? data
}

export async function setActuatorDirect(deviceId, channel, value) {
  const { data } = await client.patch(`/devices/${deviceId}/actuators/${channel}`, { command: value })
  return data
}

export async function deleteDevice(id) {
  const { data } = await client.delete(`/devices/${id}`)
  return data
}

export async function getDeviceConnectivity(id) {
  const { data } = await client.get(`/devices/${id}/connectivity`)
  return data.data ?? data
}

export async function setMaintenanceMode(id, enabled) {
  const { data } = await client.patch(`/devices/${id}/maintenance`, { enabled })
  return data.data ?? data
}

export async function updateHealthConfig(id, config) {
  const { data } = await client.patch(`/devices/${id}/health-config`, config)
  return data.data ?? data
}
