import { useState, useEffect } from 'react'
import { useAuth } from '../../../api/AuthContext.jsx'
import { login, register } from '../../../api/client.js'

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

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      {/* Background effects */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}>
        <div style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(var(--spore-green-rgb), 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'breathing-pulse 6s infinite ease-in-out',
        }} />
      </div>

      {/* Modal card */}
      <div
        className="glass-card modal-content"
        onClick={e => e.stopPropagation()}
      >
        {/* Header glow line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '75%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(var(--spore-green-rgb), 0.3), transparent)',
        }} />

        <div style={{ padding: '32px' }}>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              background: 'none',
              border: 'none',
              color: 'var(--on-surface-variant)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>

          {/* Brand */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div
              className="breathing-pulse"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(var(--spore-green-rgb), 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                boxShadow: '0 0 20px rgba(var(--spore-green-rgb), 0.1)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--spore-green)' }}>grain</span>
            </div>
            <h2 className="gradient-title" style={{ fontSize: '24px', marginBottom: '4px' }}>Mush2</h2>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--outline)',
            }}>
              {mode === 'LOGIN' ? 'ACCESO AL SISTEMA' : 'REGISTRO EN LA RED'}
            </p>
          </div>

          {/* Tab toggle */}
          <div style={{
            position: 'relative',
            display: 'flex',
            gap: '4px',
            marginBottom: '32px',
            background: 'var(--surface-container-lowest)',
            borderRadius: '12px',
            padding: '4px',
            border: '1px solid var(--outline-variant)',
          }}>
            <div
              style={{
                position: 'absolute',
                top: '4px',
                bottom: '4px',
                borderRadius: '8px',
                background: 'var(--spore-green)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 2)',
                left: mode === 'LOGIN' ? '4px' : '50%',
                width: 'calc(50% - 8px)',
                boxShadow: '0 0 12px rgba(var(--spore-green-rgb), 0.15)',
              }}
            />
            <button
              type="button"
              style={{
                position: 'relative',
                flex: 1,
                padding: '10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                zIndex: 10,
                background: 'none',
                color: mode === 'LOGIN' ? 'var(--bg-deep)' : 'var(--on-surface-variant)',
                transition: 'color 0.2s',
              }}
              onClick={() => { setMode('LOGIN'); setError(null) }}
            >
              INGRESAR
            </button>
            <button
              type="button"
              style={{
                position: 'relative',
                flex: 1,
                padding: '10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                zIndex: 10,
                background: 'none',
                color: mode === 'REGISTER' ? 'var(--bg-deep)' : 'var(--on-surface-variant)',
                transition: 'color 0.2s',
              }}
              onClick={() => { setMode('REGISTER'); setError(null) }}
            >
              REGISTRARSE
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Username */}
            <div>
              <label style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--on-surface-variant)',
                marginBottom: '4px',
                display: 'block',
                paddingLeft: '4px',
              }}>USUARIO</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px',
                  color: 'var(--outline)',
                }}>badge</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="ingresa tu usuario"
                  required
                  autoComplete="username"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            {/* Email (register only) */}
            {mode === 'REGISTER' && (
              <div style={{ animation: 'slideDown 0.25s ease-out' }}>
                <label style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--on-surface-variant)',
                  marginBottom: '4px',
                  display: 'block',
                  paddingLeft: '4px',
                }}>EMAIL</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '16px',
                    color: 'var(--outline)',
                  }}>mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    required
                    autoComplete="email"
                    className="form-input"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--on-surface-variant)',
                marginBottom: '4px',
                display: 'block',
                paddingLeft: '4px',
              }}>CONTRASEÑA</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px',
                  color: 'var(--outline)',
                }}>fingerprint</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="ingresa-tu-contraseña"
                  required
                  autoComplete={mode === 'LOGIN' ? 'current-password' : 'new-password'}
                  className="form-input"
                  style={{ paddingLeft: '40px', paddingRight: '48px' }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                  onClick={() => setShowPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--on-surface-variant)',
                    cursor: 'pointer',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Confirm Password (register only) */}
            {mode === 'REGISTER' && (
              <div style={{ animation: 'slideDown 0.25s ease-out' }}>
                <label style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--on-surface-variant)',
                  marginBottom: '4px',
                  display: 'block',
                  paddingLeft: '4px',
                }}>CONFIRMAR CONTRASEÑA</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '16px',
                    color: 'var(--outline)',
                  }}>fingerprint</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="ingresa-tu-contraseña"
                    required
                    autoComplete="new-password"
                    className="form-input"
                    style={{ paddingLeft: '40px' }}
                  />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                  onClick={() => setShowPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--on-surface-variant)',
                    cursor: 'pointer',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  animation: 'shake 0.3s ease-out',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--error-red)' }}>warning</span>
                <span style={{ fontSize: '12px', color: 'var(--error-red)', flex: 1 }}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <div style={{ paddingTop: '8px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-glow"
                style={{
                  width: '100%',
                  padding: '14px',
                  opacity: loading ? 0.85 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {loading ? 'sync' : mode === 'LOGIN' ? 'login' : 'person_add'}
                </span>
                {loading ? 'PROCESANDO...' : mode === 'LOGIN' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
              </button>
            </div>
          </form>

          {/* Switch mode */}
          <div style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid var(--outline-variant)',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
              {mode === 'LOGIN' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </span>
            <button
              type="button"
              onClick={switchMode}
              style={{
                marginLeft: '6px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--spore-green)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
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
