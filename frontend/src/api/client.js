import axios from 'axios'

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('mush2_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED') {
      const refreshToken = sessionStorage.getItem('mush2_refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken })
          sessionStorage.setItem('mush2_access_token', data.token.accessToken)
          sessionStorage.setItem('mush2_refresh_token', data.token.refreshToken)
          err.config.headers.Authorization = `Bearer ${data.token.accessToken}`
          return client(err.config)
        } catch {
          sessionStorage.removeItem('mush2_user')
          sessionStorage.removeItem('mush2_access_token')
          sessionStorage.removeItem('mush2_refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export async function getDevices() {
  const { data } = await client.get('/devices')
  return data.data
}

export async function getDevice(id) {
  const { data } = await client.get(`/devices/${id}`)
  return data
}

export async function getLatestTelemetry(deviceId) {
  const { data } = await client.get(`/devices/${deviceId}/telemetry/latest`)
  return data
}

export async function getTelemetryHistory(deviceId, { sensorType, limit = 8000, from, resolution } = {}) {
  const params = { limit }
  if (sensorType) params.sensorType = sensorType
  if (from) params.from = from
  if (resolution != null) params.resolution = resolution
  const { data } = await client.get(`/devices/${deviceId}/telemetry`, { params })
  return data.data
}

export async function getActuators(deviceId) {
  const { data } = await client.get(`/devices/${deviceId}/actuators`)
  return data.data
}

export async function setActuator(deviceId, channel, command) {
  const { data } = await client.patch(`/devices/${deviceId}/actuators/${channel}`, { command })
  return data
}

export async function setActuatorDirect(deviceId, channel, command) {
  const { data } = await client.patch(`/actuators/${channel}`, { deviceId, command })
  return data
}

export async function getRecipes() {
  const { data } = await client.get('/recipes')
  return data.data
}

export async function getRecipe(id) {
  const { data } = await client.get(`/recipes/${id}`)
  return data
}

export async function createRecipe(recipe) {
  const { data } = await client.post('/recipes', recipe)
  return data
}

export async function updateRecipe(id, recipe) {
  const { data } = await client.put(`/recipes/${id}`, recipe)
  return data
}

export async function getCycles() {
  const { data } = await client.get('/cycles')
  return data.data
}

export async function createCycle(cycle) {
  const { data } = await client.post('/cycles', cycle)
  return data
}

export async function updateCycle(id, payload) {
  const { data } = await client.patch(`/cycles/${id}`, payload)
  return data
}

export async function register(username, email, password) {
  const { data } = await client.post('/auth/register', { username, email, password })
  return data
}

export async function login(username, password) {
  const { data } = await client.post('/auth/login', { username, password })
  return data
}

export async function refreshToken() {
  const token = sessionStorage.getItem('mush2_refresh_token')
  const { data } = await client.post('/auth/refresh', { refreshToken: token })
  return data
}

export async function createDevice(device) {
  const { data } = await client.post('/devices', device)
  return data
}

export async function claimDevice(id, payload = {}) {
  const { data } = await client.post(`/devices/${id}/claim`, payload)
  return data
}

export async function updateDevice(id, payload) {
  const { data } = await client.patch(`/devices/${id}`, payload)
  return data
}

export async function updateDeviceSsrMode(id, ssrActiveLow) {
  return updateDevice(id, { ssrActiveLow })
}

export async function getMe() {
  const { data } = await client.get('/auth/me')
  return data
}

export async function updateProfile(payload) {
  const { data } = await client.patch('/auth/me', payload)
  return data
}

export async function getSystemMetrics() {
  const { data } = await client.get('/monitoring/metrics')
  return data
}

export async function validateThingSpeak(deviceId, apiKey) {
  const { data } = await client.post(`/devices/${deviceId}/thingSpeak/validate`, { apiKey })
  return data
}

export async function getAlarms({ page = 1, limit = 50, severity, status } = {}) {
  const params = { page, limit }
  if (severity) params.severity = severity
  if (status) params.status = status
  const { data } = await client.get('/alarms', { params })
  return data
}

export async function getAlarmStats() {
  const { data } = await client.get('/alarms/stats')
  return data.data
}

export async function acknowledgeAlarm(id) {
  const { data } = await client.patch(`/alarms/${id}/acknowledge`)
  return data
}

export async function resolveAlarm(id) {
  const { data } = await client.patch(`/alarms/${id}/resolve`)
  return data
}

export async function getApiKeys({ page = 1, limit = 50 } = {}) {
  const { data } = await client.get('/api-keys', { params: { page, limit } })
  return data
}

export async function createApiKey(payload = {}) {
  const { data } = await client.post('/api-keys', payload)
  return data
}

export async function updateApiKey(id, payload) {
  const { data } = await client.patch(`/api-keys/${id}`, payload)
  return data
}

export async function deleteApiKey(id) {
  const { data } = await client.delete(`/api-keys/${id}`)
  return data
}

export async function rotateApiKey(id) {
  const { data } = await client.post(`/api-keys/${id}/rotate`)
  return data
}

export async function getProfile() {
  const { data } = await client.get('/settings/profile')
  return data.data
}

export async function updateProfileSettings(payload) {
  const { data } = await client.patch('/settings/profile', payload)
  return data.data
}

export async function changePassword(currentPassword, newPassword) {
  const { data } = await client.post('/settings/change-password', { currentPassword, newPassword })
  return data
}

export async function getSystemSettings() {
  const { data } = await client.get('/settings/system')
  return data.data
}

export async function updateSystemSettings(settings) {
  const { data } = await client.patch('/settings/system', { settings })
  return data
}

export async function seedSystemSettings() {
  const { data } = await client.post('/settings/system/seed')
  return data
}

export async function getPublicSettings() {
  const { data } = await client.get('/settings/system/public')
  return data.data
}

export default client
