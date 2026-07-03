import { useState } from 'react'
import AuthModal from '../components/auth/AuthModal.jsx'

function Landing() {
  const [showAuth, setShowAuth] = useState(false)

  return (
    <div className="pb-20" style={{ minHeight: '100vh', background: 'var(--bg-deep)' }}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="breathing-node w-[800px] h-[800px] rounded-full blur-3xl absolute"
          style={{ top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <path className="bioluminescent-line" d="M-100,200 Q200,400 600,200 T1200,500" fill="none" opacity="0.15" stroke="#44e2cd" strokeWidth="0.5" />
          <path className="bioluminescent-line" d="M-200,800 Q400,600 800,900 T1500,400" fill="none" opacity="0.1" stroke="#6bfb9a" strokeWidth="0.5" />
        </svg>
      </div>

      <header className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>grain</span>
          <span className="text-headline-md text-primary">Mush2</span>
        </div>
        <nav className="flex items-center gap-4">
          <button
            onClick={() => setShowAuth(true)}
            className="btn btn-primary px-6 py-2"
          >
            INGRESAR
          </button>
        </nav>
      </header>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-highest border border-primary/30 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-primary breathing-pulse" />
            <span className="font-label-caps text-label-caps text-primary">PLATAFORMA DE CULTIVO INTELIGENTE</span>
          </div>
          <h1 className="text-display-data text-[clamp(40px,7vw,72px)] text-white mb-6 leading-[0.85] tracking-tight">
            MYCELIUM<br />NETWORK
          </h1>
          <p className="text-headline-md text-on-surface-variant mb-8 max-w-xl leading-relaxed">
            Plataforma de código abierto para el monitoreo y control de cámaras de cultivo de hongos.
            Automatiza, optimiza y escala tu producción con precisión.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setShowAuth(true)}
              className="btn btn-primary px-8 py-4 text-label-caps"
              style={{ boxShadow: '0 0 12px var(--spore-glow)' }}
            >
              COMENZAR
            </button>
            <button
              onClick={() => setShowAuth(true)}
              className="px-8 py-4 border border-secondary text-secondary font-label-caps text-label-caps rounded hover:bg-secondary/10 transition-all cursor-pointer"
              style={{ background: 'none' }}
            >
              MÁS INFORMACIÓN
            </button>
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-xl border-t-2 border-t-primary flex flex-col">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-lg mb-4">
              <span className="material-symbols-outlined text-primary">sensors</span>
            </div>
            <h3 className="text-headline-md text-white mb-2">Monitoreo en Tiempo Real</h3>
            <p className="text-body-md text-on-surface-variant flex-1">
              Sensores de temperatura, humedad, CO2 y más. Visualiza datos en vivo con gráficos y alertas inteligentes.
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl border-t-2 border-t-secondary flex flex-col">
            <div className="w-12 h-12 bg-secondary/10 flex items-center justify-center rounded-lg mb-4">
              <span className="material-symbols-outlined text-secondary">potted_plant</span>
            </div>
            <h3 className="text-headline-md text-white mb-2">Recetas de Cultivo</h3>
            <p className="text-body-md text-on-surface-variant flex-1">
              Crea y programa perfiles ambientales personalizados para cada especie y etapa de crecimiento.
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl border-t-2 border-t-tertiary flex flex-col">
            <div className="w-12 h-12 bg-tertiary/10 flex items-center justify-center rounded-lg mb-4">
              <span className="material-symbols-outlined text-tertiary">devices</span>
            </div>
            <h3 className="text-headline-md text-white mb-2">Control de Actuadores</h3>
            <p className="text-body-md text-on-surface-variant flex-1">
              Ventiladores, humidificadores, luces y más. Control automatizado o manual desde cualquier lugar.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="glass-card rounded-xl border border-outline-variant overflow-hidden">
          <div className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <span className="font-label-caps text-label-caps text-primary bg-primary/10 px-2 py-1 border border-primary/20 rounded inline-block mb-4">
                OPEN SOURCE
              </span>
              <h2 className="text-headline-lg text-white mb-3">
                Construido para la comunidad
              </h2>
              <p className="text-body-md text-on-surface-variant mb-6">
                Mush2 es un proyecto de código abierto. Desde firmware ESP32 hasta la plataforma web,
                todo está disponible para que contribuyas, lo adaptes y lo mejores.
              </p>
              <button
                onClick={() => setShowAuth(true)}
                className="btn btn-primary px-8 py-3"
              >
                UNIRSE
              </button>
            </div>
            <div className="flex-shrink-0 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl">code</span>
              </div>
              <div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-3xl">groups</span>
              </div>
              <div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-3xl">iot</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-outline-variant/30">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary breathing-pulse" />
            <span className="font-label-caps text-label-caps text-on-surface-variant">MUSH2 // SISTEMA OPERATIVO</span>
          </div>
          <div className="flex gap-6">
            <span className="font-label-caps text-label-caps text-outline">v2.0.0</span>
            <span className="font-label-caps text-label-caps text-outline">DOCS</span>
            <span className="font-label-caps text-label-caps text-outline">GITHUB</span>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}

export default Landing
