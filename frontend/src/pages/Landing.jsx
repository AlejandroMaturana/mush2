import { useState, useEffect } from 'react'
import AuthModal from '../components/auth/AuthModal.jsx'

const ACCENT_MAP = {
  primary: { border: '2px solid var(--spore-green)', bg: 'rgba(107,251,154,0.1)', color: 'var(--spore-green)', label: '' },
  secondary: { border: '2px solid var(--teal)', bg: 'rgba(68,226,205,0.1)', color: 'var(--teal)', label: '' },
  tertiary: { border: '2px solid var(--amber)', bg: 'rgba(255,182,87,0.1)', color: 'var(--amber)', label: '' },
}

const FEATURES = [
  {
    icon: 'sensors',
    label: 'MONITOREO EN VIVO',
    title: 'Telemetría en Tiempo Real',
    desc: 'Sensores de temperatura, humedad, CO₂ y flujo de aire. Visualiza métricas con gráficos dinámicos y alertas inteligentes.',
    accent: 'primary',
  },
  {
    icon: 'potted_plant',
    label: 'RECETAS',
    title: 'Perfiles de Cultivo',
    desc: 'Diseña secuencias ambientales para cada especie. Fase de incubación, fructificación y cosecha con control preciso.',
    accent: 'secondary',
  },
  {
    icon: 'devices',
    label: 'ACTUADORES',
    title: 'Control Remoto',
    desc: 'Ventiladores, humidificadores, iluminación y más. Control remoto con automatización programada o manual.',
    accent: 'tertiary',
  },
]

const NETWORK_NODES = [
  { cx: '15%', cy: '30%', delay: 0 },
  { cx: '45%', cy: '20%', delay: 0.5 },
  { cx: '75%', cy: '35%', delay: 1 },
  { cx: '30%', cy: '60%', delay: 1.5 },
  { cx: '60%', cy: '55%', delay: 2 },
  { cx: '85%', cy: '65%', delay: 2.5 },
  { cx: '20%', cy: '80%', delay: 3 },
  { cx: '55%', cy: '75%', delay: 3.5 },
  { cx: '80%', cy: '50%', delay: 4 },
]

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  size: Math.random() * 2.5 + 0.8,
  opacity: 0.25 + Math.random() * 0.4,
  delay: Math.random() * 5,
  duration: Math.random() * 4 + 3,
}))

function Particle({ style }) {
  return (
    <div
      className="absolute rounded-full bg-primary breathing-pulse"
      style={style}
    />
  )
}

function Landing() {
  const [showAuth, setShowAuth] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })

  useEffect(() => {
    function onMove(e) {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const bgOffsetX = (mousePos.x - 0.5) * 30
  const bgOffsetY = (mousePos.y - 0.5) * 30

  return (
    <div className="relative" style={{ minHeight: '100vh', background: 'var(--bg-deep)', overflow: 'hidden' }}>
      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.025,
        }}
      />

      {/* Background orbs */}
      <div
        className="fixed pointer-events-none z-0"
        style={{
          top: '50%',
          left: '50%',
          width: '900px',
          height: '900px',
          transform: `translate(calc(-50% + ${bgOffsetX}px), calc(-50% + ${bgOffsetY}px))`,
        }}
      >
        <div
          className="absolute inset-0 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(107,251,154,0.15) 0%, rgba(68,226,205,0.04) 40%, transparent 70%)',
            animation: 'breathe 6s infinite ease-in-out',
          }}
        />
      </div>
      <div
        className="fixed pointer-events-none z-0"
        style={{
          top: '20%',
          right: '10%',
          width: '500px',
          height: '500px',
          transform: `translate(${bgOffsetX * -0.5}px, ${bgOffsetY * -0.5}px)`,
        }}
      >
        <div
          className="absolute inset-0 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(68,226,205,0.08) 0%, transparent 60%)',
            animation: 'breathe 8s infinite ease-in-out 2s',
          }}
        />
      </div>
      <div
        className="fixed pointer-events-none z-0"
        style={{
          bottom: '10%',
          left: '5%',
          width: '400px',
          height: '400px',
          transform: `translate(${bgOffsetX * 0.3}px, ${bgOffsetY * 0.3}px)`,
        }}
      >
        <div
          className="absolute inset-0 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(255,182,87,0.05) 0%, transparent 60%)',
            animation: 'breathe 10s infinite ease-in-out 4s',
          }}
        />
      </div>

      {/* Floating particles */}
      {PARTICLES.map(p => (
        <Particle
          key={p.id}
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      {/* SVG Mycelium Network Background */}
      <svg
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ width: '100%', height: '100%', opacity: 0.12 }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        {NETWORK_NODES.map((node, i) => (
          <circle
            key={i}
            cx={node.cx}
            cy={node.cy}
            r="0.4"
            fill="#6bfb9a"
            className="breathing-pulse"
            style={{ animationDelay: `${node.delay}s` }}
          />
        ))}
        <path
          d="M15,30 Q30,25 45,20 T75,35"
          fill="none"
          stroke="#6bfb9a"
          strokeWidth="0.12"
          className="bioluminescent-path"
        />
        <path
          d="M45,20 Q52,40 60,55 T85,65"
          fill="none"
          stroke="#44e2cd"
          strokeWidth="0.1"
          className="bioluminescent-path"
          style={{ animationDelay: '1s' }}
        />
        <path
          d="M30,60 Q42,50 55,75 T80,50"
          fill="none"
          stroke="#6bfb9a"
          strokeWidth="0.1"
          className="bioluminescent-path"
          style={{ animationDelay: '2s' }}
        />
        <path
          d="M15,30 Q22,55 30,60 T55,75"
          fill="none"
          stroke="#44e2cd"
          strokeWidth="0.08"
          className="bioluminescent-path"
          style={{ animationDelay: '3s' }}
        />
        <path
          d="M75,35 Q80,42 85,65"
          fill="none"
          stroke="#ffb657"
          strokeWidth="0.08"
          className="bioluminescent-path"
          style={{ animationDelay: '4s' }}
        />
      </svg>

      {/* Header */}
      <header className="relative z-10" style={{ borderBottom: '1px solid rgba(61,74,62,0.3)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center breathing-pulse"
              style={{ boxShadow: '0 0 12px rgba(107,251,154,0.15)' }}
            >
              <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: '"FILL" 1' }}>grain</span>
            </div>
            <span className="text-headline-md text-primary tracking-tight">Mush2</span>
            <span className="hidden sm:inline font-label-caps text-label-caps text-outline ml-2">// v2.0.0</span>
          </div>
          <nav className="flex items-center gap-3">
            <button
              onClick={() => setShowAuth(true)}
              className="btn btn-primary px-5 py-2 text-label-caps"
              style={{ boxShadow: '0 0 16px rgba(74,222,128,0.15)' }}
            >
              INGRESAR
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-24 flex flex-col lg:flex-row lg:items-center lg:gap-16" style={{ minHeight: 'calc(100vh - 64px)' }}>
          <div className="flex-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-highest border border-primary/20 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-primary" style={{ boxShadow: '0 0 6px var(--spore-green)' }} />
              <span className="font-label-caps text-label-caps text-primary tracking-widest">RED ACTIVA // CULTIVO INTELIGENTE</span>
            </div>

            <h1
              className="font-mono font-semibold text-white mb-6 tracking-tight"
              style={{
                fontSize: 'clamp(48px, 8vw, 88px)',
                lineHeight: '0.88',
                letterSpacing: '-0.03em',
                textShadow: '0 0 40px rgba(107,251,154,0.08)',
              }}
            >
              MYCELIUM<br />
              <span className="text-primary" style={{ textShadow: '0 0 60px rgba(107,251,154,0.15)' }}>NETWORK</span>
            </h1>

            <p className="text-headline-md text-on-surface-variant mb-10 max-w-lg leading-relaxed" style={{ fontSize: '18px' }}>
              Plataforma de código abierto para el monitoreo y control de cámaras de cultivo de hongos.
              Automatiza, optimiza y escala tu producción con precisión milimétrica.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowAuth(true)}
                className="btn btn-primary px-8 py-4 text-label-caps relative overflow-hidden group"
                style={{ boxShadow: '0 0 24px rgba(74,222,128,0.2)' }}
              >
                <span className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>login</span>
                COMENZAR
              </button>
              <button
                onClick={() => setShowAuth(true)}
                className="px-8 py-4 border border-secondary/40 text-secondary font-label-caps text-label-caps rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                style={{ background: 'transparent' }}
                style={{ background: 'transparent' }}
              >
                <span className="material-symbols-outlined text-sm">sensors</span>
                EXPLORAR PLATAFORMA
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-8 mt-16">
              <div>
                <span className="font-label-caps text-label-caps text-outline">CÓDIGO ABIERTO</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-headline-lg text-white font-mono font-semibold">100%</span>
                  <span className="text-data-sm text-primary">MIT</span>
                </div>
              </div>
              <div>
                <span className="font-label-caps text-label-caps text-outline">ARQUITECTURA</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-headline-lg text-white font-mono font-semibold">IoT</span>
                  <span className="text-data-sm text-secondary">ESP32</span>
                </div>
              </div>
              <div>
                <span className="font-label-caps text-label-caps text-outline">PROTOCOLO</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-headline-lg text-white font-mono font-semibold">REST</span>
                  <span className="text-data-sm text-tertiary">+MQTT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating stats cards */}
          <div className="hidden lg:flex flex-col gap-4 flex-shrink-0" style={{ minWidth: '280px' }}>
            <div
              className="glass-card rounded-xl p-5 relative overflow-hidden group"
              style={{ border: '1px solid rgba(107,251,154,0.15)' }}
            >
              <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl transition-all duration-700" style={{ background: 'rgba(107,251,154,0.05)' }} />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">TEMPERATURA</span>
                  <span className="material-symbols-outlined text-primary text-sm">device_thermostat</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-semibold text-white" style={{ fontSize: '36px', lineHeight: 1 }}>24.2</span>
                  <span className="text-headline-md text-on-surface-variant">°C</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: '62%', boxShadow: '0 0 6px rgba(107,251,154,0.3)' }} />
                  </div>
                  <span className="font-label-caps text-10px text-primary">ESTABLE</span>
                </div>
              </div>
            </div>

            <div
              className="glass-card rounded-xl p-5 relative overflow-hidden group"
              style={{ border: '1px solid rgba(68,226,205,0.15)' }}
            >
              <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl transition-all duration-700" style={{ background: 'rgba(68,226,205,0.05)' }} />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">HUMEDAD</span>
                  <span className="material-symbols-outlined text-secondary text-sm">humidity_high</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-semibold text-white" style={{ fontSize: '36px', lineHeight: 1 }}>92.1</span>
                  <span className="text-headline-md text-on-surface-variant">%</span>
                </div>
                <div className="mt-4 flex gap-1 h-8 items-end">
                  {[40, 55, 70, 85, 92, 88, 75].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm transition-all duration-300"
                      style={{
                        height: `${h}%`,
                        background: h >= 85 ? 'var(--teal)' : `rgba(68,226,205,${0.2 + h * 0.008})`,
                        boxShadow: h >= 85 ? '0 0 8px rgba(68,226,205,0.2)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div
              className="glass-card rounded-xl p-5 relative overflow-hidden group"
              style={{ border: '1px solid rgba(255,182,87,0.15)' }}
            >
              <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl transition-all duration-700" style={{ background: 'rgba(255,182,87,0.05)' }} />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">CO₂</span>
                  <span className="material-symbols-outlined text-tertiary text-sm">co2</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-semibold text-white" style={{ fontSize: '36px', lineHeight: 1 }}>840</span>
                  <span className="text-headline-md text-on-surface-variant">ppm</span>
                </div>
                <div className="mt-4 grid grid-cols-8 gap-1">
                  {[1, 1, 1, 0.8, 0.5, 0.3, 0.2, 0.1].map((o, i) => (
                    <div
                      key={i}
                      className="h-1.5 rounded-sm"
                      style={{
                        background: o >= 0.8 ? 'var(--amber)' : `rgba(255,182,87,${o})`,
                        boxShadow: o >= 0.8 ? '0 0 6px rgba(255,182,87,0.3)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-pulse-slow">
          <span className="font-label-caps text-9px text-outline tracking-widest">DESCUBRE</span>
          <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, var(--outline), transparent)' }} />
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24" style={{ borderTop: '1px solid rgba(61,74,62,0.2)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="font-label-caps text-label-caps text-primary bg-primary/10 px-3 py-1 border border-primary/20 rounded-full inline-block mb-4">
              CAPACIDADES
            </span>
            <h2 className="text-headline-lg text-white mb-3" style={{ fontSize: '36px' }}>
              Todo lo que necesitas para cultivar
            </h2>
            <p className="text-body-md text-on-surface-variant max-w-lg mx-auto">
              Una plataforma unificada que integra hardware, software y datos en tiempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const a = ACCENT_MAP[f.accent]
              return (
                <div
                  key={i}
                  className="glass-card rounded-xl p-6 group hover:translate-y-[-4px] transition-all duration-300"
                  style={{ borderTop: a.border }}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 flex items-center justify-center rounded-xl" style={{ background: a.bg }}>
                      <span className="material-symbols-outlined text-2xl" style={{ color: a.color }}>{f.icon}</span>
                    </div>
                    <span className="font-label-caps text-label-caps opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: a.color }}>
                      {f.label}
                    </span>
                  </div>
                  <h3 className="text-headline-md text-white mb-2">{f.title}</h3>
                  <p className="text-body-md text-on-surface-variant flex-1">{f.desc}</p>
                  <div className="mt-5 flex items-center gap-2 text-data-sm text-primary">
                    <span className="font-label-caps text-label-caps">EXPLORAR</span>
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-24" style={{ background: 'rgba(12,18,15,0.5)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '100%', label: 'OPEN SOURCE', sub: 'Licencia MIT', color: 'var(--spore-green)' },
              { value: '24/7', label: 'MONITOREO', sub: 'Tiempo real', color: 'var(--teal)' },
              { value: 'ESP32', label: 'FIRMWARE', sub: 'Arquitectura dual', color: 'var(--amber)' },
              { value: 'REST', label: 'API', sub: '+ WebSockets + MQTT', color: 'var(--spore-green)' },
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="font-mono font-semibold mb-2 transition-all duration-300 group-hover:scale-110" style={{ fontSize: 'clamp(32px, 5vw, 64px)', color: stat.color }}>
                  {stat.value}
                </div>
                <div className="font-label-caps text-label-caps text-on-surface-variant">{stat.label}</div>
                <div className="text-data-sm text-outline mt-1">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source CTA */}
      <section className="relative z-10 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="glass-card rounded-2xl overflow-hidden relative group"
            style={{ border: '1px solid rgba(107,251,154,0.12)' }}>
            <div className="absolute inset-0 transition-opacity duration-700 opacity-0 group-hover:opacity-100" style={{ background: 'linear-gradient(90deg, rgba(107,251,154,0.05), transparent, rgba(68,226,205,0.05))' }} />
            <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl transition-all duration-700" style={{ background: 'rgba(107,251,154,0.05)' }} />
            <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <span className="font-label-caps text-label-caps text-primary bg-primary/10 px-3 py-1.5 border border-primary/20 rounded-full inline-block mb-4">
                  COMUNIDAD
                </span>
                <h2 className="text-headline-lg text-white mb-3" style={{ fontSize: '32px' }}>
                  Construido para la comunidad
                </h2>
                <p className="text-body-md text-on-surface-variant mb-6 max-w-lg">
                  Mush2 es un proyecto de código abierto. Desde el firmware ESP32 hasta la plataforma web,
                  todo está disponible para que contribuyas, lo adaptes y seas parte.
                </p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="btn btn-primary px-8 py-3 text-label-caps"
                  style={{ boxShadow: '0 0 20px rgba(74,222,128,0.15)' }}
                >
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>person_add</span>
                  UNIRSE AHORA
                </button>
              </div>
              <div className="flex-shrink-0 flex items-center gap-5">
                {[
                  { icon: 'code', color: 'var(--spore-green)', bg: 'rgba(107,251,154,0.1)' },
                  { icon: 'groups', color: 'var(--teal)', bg: 'rgba(68,226,205,0.1)' },
                  { icon: 'iot', color: 'var(--amber)', bg: 'rgba(255,182,87,0.1)' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center border border-outline-variant/30 hover:scale-110 transition-all duration-300"
                    style={{ background: item.bg }}
                  >
                    <span className="material-symbols-outlined text-3xl" style={{ color: item.color }}>{item.icon}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10" style={{ borderTop: '1px solid rgba(61,74,62,0.3)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary" style={{ boxShadow: '0 0 6px var(--spore-green)' }} />
            <span className="font-label-caps text-label-caps text-on-surface-variant">MUSH2 // SISTEMA OPERATIVO</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="font-label-caps text-label-caps text-outline hover:text-primary transition-colors cursor-pointer">DOCS</span>
            <span className="font-label-caps text-label-caps text-outline hover:text-primary transition-colors cursor-pointer">GITHUB</span>
            <span className="font-label-caps text-label-caps text-outline">v2.0.0</span>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}

export default Landing
