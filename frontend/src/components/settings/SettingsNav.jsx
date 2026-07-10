import { NavLink } from 'react-router-dom'

const SECTIONS = [
  { to: '/settings', icon: 'hub', label: 'Overview', end: true },
  { to: '/settings/user', icon: 'fingerprint', label: 'User' },
  { to: '/settings/device', icon: 'developer_board', label: 'Device' },
  { to: '/settings/cultivation', icon: 'potted_plant', label: 'Cultivation' },
  { to: '/settings/api-keys', icon: 'vpn_key', label: 'API Keys' },
  { to: '/settings/system', icon: 'settings', label: 'System' },
]

function SettingsNav() {
  return (
    <nav className="settings-nav flex flex-col gap-1">
      {SECTIONS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={!!item.end}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 font-label-caps text-label-caps rounded-lg transition-all duration-200${isActive ? ' bg-surface-variant text-primary' : ' text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`
          }
        >
          <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default SettingsNav
