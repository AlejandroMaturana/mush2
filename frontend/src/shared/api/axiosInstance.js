import axios from 'axios'
import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore'

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

let refreshPromise = null
let loggingOut = false

client.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    loggingOut = false
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function refreshViaCookie() {
  if (!refreshPromise) {
    refreshPromise = client
      .post('/auth/refresh', null)
      .then(({ data }) => {
        setAccessToken(data.token.accessToken)
        return data.token.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

function handleSessionExpired() {
  if (loggingOut) return
  loggingOut = true
  clearAccessToken()
  localStorage.removeItem('mush2_user')
  window.location.assign('/')
}

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED') {
      try {
        const token = await refreshViaCookie()
        err.config.headers.Authorization = `Bearer ${token}`
        return client(err.config)
      } catch {
        handleSessionExpired()
      }
    }
    return Promise.reject(err)
  }
)

export default client
