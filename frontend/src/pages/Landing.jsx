import { useState } from 'react'
import AuthModal from '../components/auth/AuthModal.jsx'

const FEATURES = [
  { icon: 'sensors', label: 'MONITOREO', desc: 'Temperatura, humedad, CO₂ y flujo de aire.', color: 'primary' },
  { icon: 'potted_plant', label: 'RECETAS', desc: 'Perfiles de cultivo con control por fase.', color: 'secondary' },
  { icon: 'devices', label: 'ACTUADORES', desc: 'Ventiladores, humidificadores, iluminación.', color: 'tertiary' },
]

function Landing() {
  const [showAuth, setShowAuth] = useState(false)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-deep)' }}>
      <header className="h-12 flex items-center px-6" style={{ borderBottom: '1px solid rgba(61,74,62,0.3)' }}>
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm leading-none">grain</span>
            <span className="text-body-md text-primary">Mush2</span>
          </div>
          <button onClick={() => setShowAuth(true)} className="btn btn-primary px-4 py-1.5 text-10px font-label-caps">
            INGRESAR
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center px-6">
        <div className="max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="font-mono font-semibold text-white mb-2 tracking-tight" style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: '0.9', letterSpacing: '-0.03em' }}>
              Mush2
            </h1>
            <p className="text-body-md text-on-surface-variant mb-5 max-w-md">
              Plataforma de código abierto para el monitoreo y control de cámaras de cultivo de hongos.
            </p>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <button onClick={() => setShowAuth(true)} className="btn btn-primary">
                COMENZAR
              </button>
              <button onClick={() => setShowAuth(true)} className="btn btn-secondary">
                <span className="material-symbols-outlined text-sm">sensors</span>
                EXPLORAR
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {FEATURES.map((f, i) => (
              <div key={i} className="glass-card rounded-lg px-4 py-3 border border-outline-variant flex-1 sm:flex-none sm:w-44">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-sm" style={{ color: `var(--${f.color})` }}>{f.icon}</span>
                  <span className="font-label-caps text-9px" style={{ color: `var(--${f.color})` }}>{f.label}</span>
                </div>
                <p className="text-data-sm text-on-surface-variant leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="h-10 flex items-center px-6" style={{ borderTop: '1px solid rgba(61,74,62,0.3)' }}>
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <span className="text-9px text-on-surface-variant">Mush2</span>
          <span className="text-9px text-outline">v1.9.0</span>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}

export default Landing
