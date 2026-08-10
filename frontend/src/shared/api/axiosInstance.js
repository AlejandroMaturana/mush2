import axios from 'axios'
import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore'

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise = null

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

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED') {
      try {
        const token = await refreshViaCookie()
        err.config.headers.Authorization = `Bearer ${token}`
        return client(err.config)
      } catch {
        clearAccessToken()
        localStorage.removeItem('mush2_user')
        window.location.assign('/')
      }
    }
    return Promise.reject(err)
  }
)

export default client
