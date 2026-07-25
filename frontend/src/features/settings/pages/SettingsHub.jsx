import { useNavigate } from 'react-router-dom'

const HUB_CARDS = [
  { to: '/system/settings/user', icon: 'fingerprint', title: 'Usuario', subtitle: 'Perfil, seguridad y acceso', color: 'var(--spore-green)' },
  { to: '/system/settings/device', icon: 'developer_board', title: 'Dispositivo', subtitle: 'Hardware y calibración', color: 'var(--accent-blue, #60a5fa)' },
  { to: '/system/settings/cultivation', icon: 'potted_plant', title: 'Cultivo', subtitle: 'Parámetros, recetas y ciclos', color: 'var(--accent-purple, #a78bfa)' },
  { to: '/system/settings/api-keys', icon: 'vpn_key', title: 'Claves de API', subtitle: 'Gestionar acceso programático e integración', color: 'var(--spore-green)' },
  { to: '/system/settings/subscription', icon: 'workspace_premium', title: 'Suscripción', subtitle: 'Plan, límites de API y retención de datos', color: 'var(--accent-blue, #60a5fa)' },
  { to: '/system/settings/system', icon: 'settings', title: 'Sistema', subtitle: 'Configuración global y parámetros', color: 'var(--accent-purple, #a78bfa)' },
]

function SettingsHub() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="gradient-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Configuración</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--outline)' }}>
          Configuración del sistema y preferencias
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {HUB_CARDS.map(card => (
          <button
            key={card.to}
            onClick={() => navigate(card.to)}
            className="glass-card"
            style={{
              padding: '24px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: card.color }}>{card.icon}</span>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)' }}>{card.title}</h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--outline)' }}>{card.subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default SettingsHub
