import { useState } from 'react'
import { useAuth } from '../../api/AuthContext.jsx'
import { login, register } from '../../api/client.js'

function AuthModal({ isOpen, onClose }) {
  const { login: authLogin } = useAuth()
  const [mode, setMode] = useState('LOGIN')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (mode === 'REGISTER') {
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden')
        return
      }
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres')
        return
      }
    }

    setLoading(true)
    try {
      const fn = mode === 'LOGIN' ? login : register
      const args = mode === 'LOGIN' ? [username, password] : [username, email, password]
      const result = await fn(...args)
      authLogin(result.user, result.token.accessToken, result.token.refreshToken)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setMode(prev => prev === 'LOGIN' ? 'REGISTER' : 'LOGIN')
    setError(null)
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-surface-container border border-outline-variant rounded-xl overflow-hidden"
        style={{ boxShadow: '0 0 40px rgba(74,222,128,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="breathing-node w-full h-full rounded-full blur-3xl absolute opacity-20"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>

        <div className="relative z-10 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>grain</span>
              <span className="text-headline-md text-primary">Mush2</span>
            </div>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface transition-colors bg-transparent border-none cursor-pointer p-1 rounded"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex gap-1 mb-6 bg-surface-container-lowest rounded-lg p-1 border border-outline-variant">
            <button
              className={`flex-1 py-2 text-label-caps font-label-caps rounded-md transition-all cursor-pointer border-none ${mode === 'LOGIN' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant bg-transparent hover:text-on-surface'}`}
              onClick={() => { setMode('LOGIN'); setError(null) }}
            >
              INGRESAR
            </button>
            <button
              className={`flex-1 py-2 text-label-caps font-label-caps rounded-md transition-all cursor-pointer border-none ${mode === 'REGISTER' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant bg-transparent hover:text-on-surface'}`}
              onClick={() => { setMode('REGISTER'); setError(null) }}
            >
              REGISTRARSE
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center justify-between font-label-caps text-label-caps text-on-surface-variant px-1 mb-1">
                <span>USUARIO</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">badge</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="tu-usuario"
                  required
                  className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface text-data-sm rounded-lg py-3 pl-10 pr-4 outline-none transition-all placeholder:text-on-surface-variant/30"
                  style={{ boxShadow: 'none' }}
                  onFocus={e => { e.target.style.boxShadow = '0 0 12px var(--spore-glow)'; e.target.style.borderColor = 'var(--spore-green)' }}
                  onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = '' }}
                />
              </div>
            </div>

            {mode === 'REGISTER' && (
              <div>
                <label className="flex items-center justify-between font-label-caps text-label-caps text-on-surface-variant px-1 mb-1">
                  <span>EMAIL</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface text-data-sm rounded-lg py-3 pl-10 pr-4 outline-none transition-all placeholder:text-on-surface-variant/30"
                    style={{ boxShadow: 'none' }}
                    onFocus={e => { e.target.style.boxShadow = '0 0 12px var(--spore-glow)'; e.target.style.borderColor = 'var(--spore-green)' }}
                    onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = '' }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center justify-between font-label-caps text-label-caps text-on-surface-variant px-1 mb-1">
                <span>CONTRASEÑA</span>
              </label>
              <div className="relative password-input-wrapper">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">fingerprint</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="password-input w-full bg-surface-container-lowest border border-outline-variant text-on-surface text-data-sm rounded-lg py-3 pl-10 outline-none transition-all placeholder:text-on-surface-variant/30"
                  style={{ boxShadow: 'none' }}
                  onFocus={e => { e.target.style.boxShadow = '0 0 12px var(--spore-glow)'; e.target.style.borderColor = 'var(--spore-green)' }}
                  onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = '' }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword(prev => !prev)}
                  className="password-toggle-btn text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-16px">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {mode === 'REGISTER' && (
              <div>
                <label className="flex items-center justify-between font-label-caps text-label-caps text-on-surface-variant px-1 mb-1">
                  <span>CONFIRMAR CONTRASEÑA</span>
                </label>
                <div className="relative password-input-wrapper">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">fingerprint</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="password-input w-full bg-surface-container-lowest border border-outline-variant text-on-surface text-data-sm rounded-lg py-3 pl-10 outline-none transition-all placeholder:text-on-surface-variant/30"
                    style={{ boxShadow: 'none' }}
                    onFocus={e => { e.target.style.boxShadow = '0 0 12px var(--spore-glow)'; e.target.style.borderColor = 'var(--spore-green)' }}
                    onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = '' }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded bg-error-container/10 border border-error/40 flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-16px">warning</span>
                <span className="text-data-sm text-error">{error}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
                style={{ opacity: loading ? 0.8 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>
                  {loading ? 'sync' : mode === 'LOGIN' ? 'login' : 'person_add'}
                </span>
                {loading
                  ? 'PROCESANDO...'
                  : mode === 'LOGIN' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'
                }
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-outline-variant/30 text-center">
            <span className="text-data-sm text-on-surface-variant">
              {mode === 'LOGIN' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </span>
            <button
              type="button"
              onClick={switchMode}
              className="ml-1 font-label-caps text-label-caps text-primary bg-transparent border-none cursor-pointer hover:underline"
            >
              {mode === 'LOGIN' ? 'REGISTRARSE' : 'INICIAR SESIÓN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthModal
