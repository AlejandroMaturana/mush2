import { useState, useEffect } from 'react'
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
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })

  useEffect(() => {
    if (!isOpen) return
    function onMove(e) {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

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

  const bgX = (mousePos.x - 0.5) * 20
  const bgY = (mousePos.y - 0.5) * 20

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: '700px',
            height: '700px',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${bgX}px), calc(-50% + ${bgY}px))`,
            background: 'radial-gradient(circle, rgba(107,251,154,0.1) 0%, rgba(68,226,205,0.03) 40%, transparent 70%)',
            animation: 'breathe 6s infinite ease-in-out',
          }}
        />
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: '300px',
            height: '300px',
            top: '20%',
            right: '15%',
            transform: `translate(${bgX * -0.5}px, ${bgY * -0.5}px)`,
            background: 'radial-gradient(circle, rgba(68,226,205,0.06) 0%, transparent 60%)',
            animation: 'breathe 8s infinite ease-in-out 2s',
          }}
        />
      </div>

      {/* Modal card */}
      <div
        className="relative w-full max-w-md z-10 rounded-2xl overflow-hidden animate-in"
        style={{
          background: 'var(--surface-container)',
          border: '1px solid rgba(61,74,62,0.6)',
          boxShadow: '0 0 60px rgba(74,222,128,0.08), 0 24px 80px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.3s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(107,251,154,0.3), transparent)' }} />

        <div className="relative p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all bg-transparent border-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>

          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 breathing-pulse"
              style={{ boxShadow: '0 0 20px rgba(107,251,154,0.1)' }}
            >
              <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>grain</span>
            </div>
            <h2 className="text-headline-lg text-primary tracking-tight">Mush2</h2>
            <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">
              {mode === 'LOGIN' ? 'ACCESO AL SISTEMA' : 'REGISTRO EN LA RED'}
            </p>
          </div>

          {/* Tab toggle */}
          <div className="relative flex gap-1 mb-8 bg-surface-container-lowest rounded-xl p-1 border border-outline-variant/50">
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-primary transition-all duration-300 ease-out"
              style={{
                left: mode === 'LOGIN' ? '4px' : '50%',
                width: 'calc(50% - 8px)',
                boxShadow: '0 0 12px rgba(74,222,128,0.15)',
              }}
            />
            <button
              className={`relative flex-1 py-2.5 text-label-caps font-label-caps rounded-lg transition-all duration-200 cursor-pointer border-none z-10 ${
                mode === 'LOGIN' ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => { setMode('LOGIN'); setError(null) }}
            >
              INGRESAR
            </button>
            <button
              className={`relative flex-1 py-2.5 text-label-caps font-label-caps rounded-lg transition-all duration-200 cursor-pointer border-none z-10 ${
                mode === 'REGISTER' ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => { setMode('REGISTER'); setError(null) }}
            >
              REGISTRARSE
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant px-1">
                USUARIO
              </label>
              <div className="relative group/input">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-sm transition-colors duration-200 group-focus-within/input:text-primary">badge</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="tu-usuario"
                  required
                  autoComplete="username"
                  className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface text-data-sm rounded-xl py-3 pl-11 pr-4 outline-none transition-all duration-200 placeholder:text-on-surface-variant/25"
                  style={{ boxShadow: 'none' }}
                  onFocus={e => { e.target.style.boxShadow = '0 0 16px rgba(74,222,128,0.12)'; e.target.style.borderColor = 'var(--spore-green)' }}
                  onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = '' }}
                />
              </div>
            </div>

            {mode === 'REGISTER' && (
              <div className="space-y-1 animate-in" style={{ animation: 'slideDown 0.25s ease-out' }}>
                <label className="font-label-caps text-label-caps text-on-surface-variant px-1">
                  EMAIL
                </label>
                <div className="relative group/input">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-sm transition-colors duration-200 group-focus-within/input:text-primary">mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    required
                    autoComplete="email"
                    className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface text-data-sm rounded-xl py-3 pl-11 pr-4 outline-none transition-all duration-200 placeholder:text-on-surface-variant/25"
                    style={{ boxShadow: 'none' }}
                    onFocus={e => { e.target.style.boxShadow = '0 0 16px rgba(74,222,128,0.12)'; e.target.style.borderColor = 'var(--spore-green)' }}
                    onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = '' }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant px-1">
                CONTRASEÑA
              </label>
              <div className="relative group/input">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-sm transition-colors duration-200 group-focus-within/input:text-primary">fingerprint</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={mode === 'LOGIN' ? 'current-password' : 'new-password'}
                  className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface text-data-sm rounded-xl py-3 pl-11 pr-12 outline-none transition-all duration-200 placeholder:text-on-surface-variant/25"
                  style={{ boxShadow: 'none' }}
                  onFocus={e => { e.target.style.boxShadow = '0 0 16px rgba(74,222,128,0.12)'; e.target.style.borderColor = 'var(--spore-green)' }}
                  onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = '' }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all bg-transparent border-none cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {mode === 'REGISTER' && (
              <div className="space-y-1 animate-in" style={{ animation: 'slideDown 0.25s ease-out' }}>
                <label className="font-label-caps text-label-caps text-on-surface-variant px-1">
                  CONFIRMAR CONTRASEÑA
                </label>
                <div className="relative group/input">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-sm transition-colors duration-200 group-focus-within/input:text-primary">fingerprint</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface text-data-sm rounded-xl py-3 pl-11 pr-4 outline-none transition-all duration-200 placeholder:text-on-surface-variant/25"
                    style={{ boxShadow: 'none' }}
                    onFocus={e => { e.target.style.boxShadow = '0 0 16px rgba(74,222,128,0.12)'; e.target.style.borderColor = 'var(--spore-green)' }}
                    onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = '' }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div
                className="flex items-center gap-2.5 p-3.5 rounded-xl"
                style={{
                  background: 'rgba(147,0,10,0.08)',
                  border: '1px solid rgba(255,180,171,0.2)',
                  animation: 'shake 0.3s ease-out',
                }}
              >
                <span className="material-symbols-outlined text-error text-lg">warning</span>
                <span className="text-data-sm text-error flex-1">{error}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3.5 text-label-caps relative overflow-hidden group/btn"
                style={{
                  opacity: loading ? 0.85 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 0 20px rgba(74,222,128,0.15)',
                }}
              >
                <span className="absolute inset-0 bg-white/5 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
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

          {/* Switch mode */}
          <div className="mt-6 pt-5 border-t border-outline-variant/20 text-center">
            <span className="text-data-sm text-on-surface-variant">
              {mode === 'LOGIN' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </span>
            <button
              type="button"
              onClick={switchMode}
              className="ml-1.5 font-label-caps text-label-caps text-primary bg-transparent border-none cursor-pointer hover:underline hover:brightness-110 transition-all"
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
