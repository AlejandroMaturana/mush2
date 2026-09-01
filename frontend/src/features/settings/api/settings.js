import client from '../../../shared/api/axiosInstance'

// Profile
export async function getProfile() {
  const { data } = await client.get('/settings/profile')
  return data
}

export async function updateProfileSettings(payload) {
  const { data } = await client.patch('/settings/profile', payload)
  return data
}

export async function changePassword(payload) {
  const { data } = await client.post('/settings/change-password', payload)
  return data
}

// Telegram
export async function linkTelegram(payload) {
  const { data } = await client.post('/settings/telegram/link', payload)
  return data
}

export async function getTelegramStatus() {
  const { data } = await client.get('/settings/telegram/link')
  return data
}

export async function unlinkTelegram() {
  const { data } = await client.post('/settings/telegram/unlink')
  return data
}

// System
export async function getSystemSettings() {
  const { data } = await client.get('/settings/system')
  return data.data ?? data
}

export async function updateSystemSettings(payload) {
  const { data } = await client.patch('/settings/system', payload)
  return data
}

export async function seedSystemSettings() {
  const { data } = await client.post('/settings/system/seed')
  return data
}

export async function configureTelegramBot(payload) {
  const { data } = await client.post('/settings/telegram/configure', payload)
  return data
}

export async function getTelegramBotStatus() {
  const { data } = await client.get('/settings/telegram/bot-status')
  return data
}
