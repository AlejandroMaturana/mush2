import { useState } from 'react'
import { useAuth } from '../api/AuthContext.jsx'
import { login } from '../api/client.js'

function Login() {
  const { login: authLogin } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await login(username, password)
      authLogin(result.user, result.token.accessToken, result.token.refreshToken)
      window.location.href = '/'
    } catch (err) {
      setError(err.response?.data?.error || 'Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen w-full bg-surface-container-lowest font-body-md" style={{ minHeight: '100vh' }}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="breathing-node w-[600px] h-[600px] rounded-full blur-3xl absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <path className="bioluminescent-line" d="M-100,200 Q200,400 600,200 T1200,500" fill="none" opacity="0.2" stroke="#44e2cd" strokeWidth="0.5" />
          <path className="bioluminescent-line" d="M-200,800 Q400,600 800,900 T1500,400" fill="none" opacity="0.1" stroke="#6bfb9a" strokeWidth="0.5" />
        </svg>
      </div>

      <main className="relative z-10 w-full max-w-md px-6">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>grain</span>
            <h1 className="text-headline-lg text-primary tracking-tighter">Mush2</h1>
          </div>
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Core Systems Authentication</p>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-xl p-8 relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center justify-between font-label-caps text-label-caps text-on-surface-variant px-1 mb-1" htmlFor="username">
                <span>MYCOLOGIST ID</span>
                <span className="text-8px opacity-50">REQUIRED_FIELD</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">badge</span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="M-ALPHA-092"
                  autoFocus
                  className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface text-data-sm rounded-lg py-3 pl-10 pr-4 outline-none transition-all placeholder:text-on-surface-variant/30"
                  style={{ boxShadow: 'none' }}
                  onFocus={e => { e.target.style.boxShadow = '0 0 12px rgba(107,251,154,0.25)'; e.target.style.borderColor = '#6bfb9a' }}
                  onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = '' }}
                />
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between font-label-caps text-label-caps text-on-surface-variant px-1 mb-1" htmlFor="password">
                <span>BIOMETRIC KEY</span>
                <span className="text-8px opacity-50">ENCRYPTED_V3</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">fingerprint</span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface text-data-sm rounded-lg py-3 pl-10 pr-4 outline-none transition-all placeholder:text-on-surface-variant/30"
                  style={{ boxShadow: 'none' }}
                  onFocus={e => { e.target.style.boxShadow = '0 0 12px rgba(107,251,154,0.25)'; e.target.style.borderColor = '#6bfb9a' }}
                  onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = '' }}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded bg-error-container/10 border border-error/40 flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-16px">warning</span>
                <span className="text-data-sm text-error">{error}</span>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:brightness-110 text-on-primary font-label-caps text-label-caps py-4 rounded-lg tracking-widest transition-all flex items-center justify-center gap-2"
                style={{ border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1 }}
              >
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>
                  {loading ? 'sync' : 'login'}
                </span>
                {loading ? 'AUTHORIZING...' : 'INITIATE_UPLINK'}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-outline-variant/30 flex justify-between items-center opacity-60">
            <div>
              <span className="text-data-sm text-on-surface-variant block">System Status</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="font-label-caps text-9px text-primary">NODES_ONLINE</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-data-sm text-on-surface-variant block">Latent Protocol</span>
              <span className="font-label-caps text-9px text-amber">SPORE_SYNC_V8.1</span>
            </div>
          </div>
        </div>

        <nav className="mt-4 flex justify-center gap-4">
          <span className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors" style={{ cursor: 'pointer' }}>DIAGNOSTICS</span>
          <span className="text-outline-variant">/</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors" style={{ cursor: 'pointer' }}>LOST_KEY</span>
          <span className="text-outline-variant">/</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors" style={{ cursor: 'pointer' }}>SECURE_MESH</span>
        </nav>
      </main>
    </div>
  )
}

export default Login
