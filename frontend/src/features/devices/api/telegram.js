import client from '../../../shared/api/axiosInstance'

export async function getTelegramDeviceConfig(deviceId) {
  const { data } = await client.get(`/telegram/device/${deviceId}`)
  return data
}

export async function updateTelegramDeviceConfig(deviceId, payload) {
  const { data } = await client.put(`/telegram/device/${deviceId}`, payload)
  return data
}
