import { useState } from 'react'
import AuthModal from '../components/AuthModal.jsx'

const FEATURES = [
  { icon: 'sensors', label: 'MONITOREO', desc: 'Temperatura, humedad, CO₂ y flujo de aire en tiempo real.', color: 'var(--spore-green)' },
  { icon: 'potted_plant', label: 'RECETAS', desc: 'Perfiles de cultivo con control por fase y especies.', color: 'var(--teal)' },
  { icon: 'devices', label: 'ACTUADORES', desc: 'Ventiladores, humidificadores e iluminación automática.', color: 'var(--accent-purple)' },
]

const SPECS = [
  { value: '99.9%', label: 'FILTRATION HEPA' },
  { value: '< 600PPM', label: 'CO₂ AUTOPILOT' },
  { value: '24/7', label: 'MYCOLOGY CO-PILOT' },
]

function Landing() {
  const [showAuth, setShowAuth] = useState(false)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-deep)', position: 'relative', overflow: 'hidden' }}>

      {/* Decorative Background Glows */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '50%',
        height: '50%',
        background: 'rgba(var(--spore-green-rgb), 0.08)',
        borderRadius: '50%',
        filter: 'blur(120px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '50%',
        height: '50%',
        background: 'rgba(var(--accent-purple-rgb, 139, 92, 246), 0.05)',
        borderRadius: '50%',
        filter: 'blur(120px)',
        pointerEvents: 'none',
      }} />

      {/* Floating Particle Orbs */}
      <div className="status-dot online" style={{
        position: 'absolute',
        top: '25%',
        right: '10%',
        animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        opacity: 0.5,
      }} />
      <div className="status-dot online" style={{
        position: 'absolute',
        bottom: '25%',
        left: '12%',
        animation: 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        opacity: 0.3,
        background: 'var(--teal)',
      }} />

      {/* HEADER */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        padding: '24px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: '8px 12px',
            background: 'rgba(var(--spore-green-rgb), 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(var(--spore-green-rgb), 0.3)',
            color: 'var(--spore-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', animation: 'breathing-pulse 3s infinite ease-in-out' }}>grain</span>
          </div>
          <div>
            <span style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 900,
              fontSize: '20px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--on-surface)',
            }}>Mush<span style={{ color: 'var(--spore-green)' }}>2</span></span>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--outline)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginTop: '2px',
            }}>Biosfera autónoma</p>
          </div>
        </div>

        <button
          onClick={() => setShowAuth(true)}
          className="btn btn-ghost"
          style={{
            padding: '8px 16px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            letterSpacing: '0.05em',
            border: '1px solid rgba(var(--spore-green-rgb), 0.3)',
            color: 'var(--spore-green)',
          }}
        >
          ENTRAR A LA CONSOLA
        </button>
      </header>

      {/* HERO SECTION */}
      <main style={{
        flex: 1,
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        padding: '48px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '48px',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status Badge */}
          <div className="glass-card" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '9999px',
            width: 'fit-content',
          }}>
            <span style={{
              position: 'relative',
              display: 'flex',
              height: '8px',
              width: '8px',
            }}>
              <span style={{
                position: 'absolute',
                display: 'inline-flex',
                height: '100%',
                width: '100%',
                borderRadius: '9999px',
                background: 'var(--spore-green)',
                opacity: 0.75,
                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              }} />
              <span style={{
                position: 'relative',
                display: 'inline-flex',
                height: '100%',
                width: '100%',
                borderRadius: '9999px',
                background: 'var(--spore-green)',
              }} />
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--outline)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>ESTACIÓN DE MICología HOGAR DE NUEVA GENERACIÓN</span>
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: 'var(--on-surface)',
          }}>
            Cultiva micelio con
            <br />
            <span className="gradient-title" style={{ fontSize: 'inherit' }}>
              inteligencia autónoma.
            </span>
          </h1>

          {/* Description */}
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            lineHeight: 1.7,
            color: 'var(--outline)',
            maxWidth: '480px',
          }}>
            Mush2 combina filtración HEPA hospitalaria, control ambiental activo
            (calefacción, ventilación, nebulización ultrasónica) e inteligencia
            artificial para lograr rendimientos de cultivo superiores.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '8px' }}>
            <button
              onClick={() => setShowAuth(true)}
              className="btn btn-glow"
              style={{ padding: '12px 24px', fontSize: '13px' }}
            >
              <span>Iniciar consola de cultivo</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
            </button>
            <button
              onClick={() => setShowAuth(true)}
              className="btn btn-secondary"
              style={{ padding: '12px 24px', fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>bluetooth</span>
              <span>Conectar mi hardware</span>
            </button>
          </div>

          {/* Quick Specs Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            paddingTop: '32px',
            borderTop: '1px solid var(--outline-variant)',
            maxWidth: '400px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
          }}>
            {SPECS.map((spec, i) => (
              <div key={i}>
                <div style={{
                  color: i === 1 ? 'var(--teal)' : 'var(--spore-green)',
                  fontWeight: 900,
                  fontSize: '14px',
                  marginBottom: '4px',
                }}>{spec.value}</div>
                <div style={{ color: 'var(--outline)' }}>{spec.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Hardware Preview Card */}
        <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          {/* Status Badges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--spore-green)', animation: 'breathing-pulse 2s infinite ease-in-out' }}>radio_button_checked</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--spore-green)', fontWeight: 700 }}>M2_CHAMBER_STANDBY</span>
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--outline)',
              background: 'var(--surface-container-low)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid var(--outline-variant)',
            }}>HEPA AIR_FLOW HIGH</span>
          </div>

          {/* Hardware Wireframe Mockup */}
          <div style={{
            background: 'var(--surface-container-low)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid var(--outline-variant)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
          }}>
            {/* Glass Container Outline */}
            <div style={{
              position: 'absolute',
              inset: '24px 32px 48px 32px',
              border: '2px solid rgba(var(--spore-green-rgb), 0.2)',
              borderRadius: '24px 24px 8px 8px',
              borderBottom: '8px solid var(--outline-variant)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '16px',
            }}>
              {/* Simulated Mycelium Block */}
              <div style={{
                width: '96px',
                height: '56px',
                background: 'var(--surface-container)',
                borderRadius: '8px',
                border: '1px solid var(--outline-variant)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: '4px',
                position: 'relative',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                overflow: 'hidden',
              }}>
                <div style={{ width: '100%', height: '6px', background: 'rgba(var(--spore-green-rgb), 0.1)', borderRadius: '2px' }} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--outline)', textAlign: 'center', marginTop: '4px' }}>SAWDUST BLOCK</div>
              </div>

              {/* Humidity Mist Effect */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(var(--spore-green-rgb), 0.03)',
                borderRadius: '24px',
                backdropFilter: 'blur(1px)',
                animation: 'breathing-pulse 3s infinite ease-in-out',
                pointerEvents: 'none',
              }} />
            </div>

            {/* Glowing Sensor Nodes */}
            <div className="pulse-glow" style={{
              position: 'absolute',
              top: '40px',
              left: '48px',
              padding: '6px 8px',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--spore-green)',
              borderRadius: '9999px',
              color: 'var(--spore-green)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 0 12px rgba(var(--spore-green-rgb), 0.3)',
              zIndex: 10,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>thermostat</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 700 }}>24.2°C</span>
            </div>
            <div className="pulse-glow" style={{
              position: 'absolute',
              top: '96px',
              right: '40px',
              padding: '6px 8px',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--teal)',
              borderRadius: '9999px',
              color: 'var(--teal)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 0 12px rgba(var(--teal-rgb, 20, 184, 166), 0.3)',
              zIndex: 10,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>water_drop</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 700 }}>92% RH</span>
            </div>
            <div className="pulse-glow" style={{
              position: 'absolute',
              bottom: '64px',
              left: '40px',
              padding: '6px 8px',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--accent-purple, #8b5cf6)',
              borderRadius: '9999px',
              color: 'var(--accent-purple, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 0 12px rgba(139, 92, 246, 0.3)',
              zIndex: 10,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>air</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 700 }}>480 PPM</span>
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--outline)',
              marginTop: 'auto',
              paddingTop: '48px',
              textAlign: 'center',
              userSelect: 'none',
            }}>
              (Click Grow Console above to activate)
            </div>
          </div>

          {/* AI Adviser Snippet */}
          <div className="glass-card" style={{
            marginTop: '16px',
            padding: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--spore-green)', flexShrink: 0, marginTop: '2px' }}>smart_toy</span>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: 'var(--spore-green)', marginBottom: '4px' }}>MUSH2_AI MYCOLOGIST</div>
              <p style={{ fontSize: '11px', color: 'var(--outline)', lineHeight: 1.6 }}>
                "Detecté que eCO₂ alcanza 1200 ppm en la etapa de primordia.
                Esto provoca tallos alargados. Recomiendo iniciar un ciclo de
                ventilación de 30 segundos."
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* CORE HIGHLIGHTS GRID */}
      <section style={{
        background: 'rgba(var(--surface-container-rgb, 30, 41, 59), 0.4)',
        borderTop: '1px solid var(--outline-variant)',
        padding: '48px 24px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--outline)',
            textAlign: 'center',
            marginBottom: '32px',
          }}>
            ENGINEERED TO MEDICAL LABORATORY BIOSPHERE STANDARDS
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
          }}>
            {[
              { icon: 'thermostat', label: 'Dynamic Heating Pad', desc: 'Monitoreo autónomo de temperatura según especificaciones de la especie.', color: '#f87171' },
              { icon: 'water_drop', label: 'Ultrasonic Misting', desc: 'Niveles exactos de humedad para proteger los primordios sensibles.', color: '#60a5fa' },
              { icon: 'air', label: 'Active FAE Fan', desc: 'Ciclos inteligentes de intercambio de aire fresco contra CO₂.', color: '#34d399' },
              { icon: 'smart_toy', label: 'Mush2 AI Co-Pilot', desc: 'Troubleshooting en tiempo real, sugerencias de recetas y calibraciones.', color: 'var(--spore-green)' },
            ].map((feature, i) => (
              <div key={i} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: feature.color }}>{feature.icon}</span>
                <h3 style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--on-surface)',
                }}>{feature.label}</h3>
                <p style={{ fontSize: '11px', color: 'var(--outline)', lineHeight: 1.6 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid var(--outline-variant)',
        background: 'rgba(var(--surface-container-rgb, 30, 41, 59), 0.1)',
        padding: '24px',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--outline)',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--spore-green)' }}>verified</span>
            <span>Mush2 Mycelium Smart Platform activa y certificada</span>
          </div>
          <div>
            <span>© 2026 Mush2 Corp. Diseñado para entusiastas del cultivo orgánico.</span>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}

export default Landing
