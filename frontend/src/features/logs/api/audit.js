import client from '../../../shared/api/axiosInstance'

export async function getAuditLogs(params = {}) {
  const { data } = await client.get('/admin/audit-logs', { params })
  return data
}
