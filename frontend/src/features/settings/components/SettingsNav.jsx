import { NavLink } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider'

function SettingsNav() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const sections = [
    { to: '/system/settings/user', icon: 'fingerprint', label: 'Usuario' },
    { to: '/system/settings/device', icon: 'developer_board', label: 'Dispositivo' },
    ...(isSuperAdmin ? [{ to: '/system/settings/system', icon: 'settings', label: 'Sistema' }] : []),
  ]

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {sections.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={!!item.end}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderRadius: '8px',
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
            textDecoration: 'none', transition: 'all 0.2s',
            background: isActive ? 'rgba(var(--spore-green-rgb), 0.1)' : 'transparent',
            color: isActive ? 'var(--spore-green)' : 'var(--on-surface-variant)',
            borderLeft: isActive ? '2px solid var(--spore-green)' : '2px solid transparent',
          })}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default SettingsNav
