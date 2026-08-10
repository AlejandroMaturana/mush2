import { createContext, useContext, useState, useCallback } from 'react'
import { setAccessToken, clearAccessToken, getAccessToken } from '../../shared/api/tokenStore'
import { logout as apiLogout } from '../../features/auth/api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('mush2_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback((userData, accessToken) => {
    setUser(userData)
    localStorage.setItem('mush2_user', JSON.stringify(userData))
    setAccessToken(accessToken)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // backend logout is best-effort; local session must still be cleared
    }
    setUser(null)
    localStorage.removeItem('mush2_user')
    clearAccessToken()
  }, [])

  const getToken = useCallback(() => getAccessToken(), [])

  return (
    <AuthContext.Provider value={{ user, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
