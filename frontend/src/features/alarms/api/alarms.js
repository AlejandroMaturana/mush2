import client from '../../../shared/api/axiosInstance'

export async function getAlarmStats() {
  const { data } = await client.get('/alarms/stats')
  return data
}

export async function getAlarms(params = {}) {
  const { data } = await client.get('/alarms', { params })
  return data
}

export async function acknowledgeAlarm(id) {
  const { data } = await client.patch(`/alarms/${id}/acknowledge`)
  return data
}

export async function resolveAlarm(id) {
  const { data } = await client.patch(`/alarms/${id}/resolve`)
  return data
}
