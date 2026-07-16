import client from '../../../shared/api/axiosInstance'

export async function getChamberAnalytics(deviceId, params = {}) {
  const { data } = await client.get(`/chambers/${deviceId}/analytics`, { params })
  return data
}
