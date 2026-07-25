import { NavLink } from 'react-router-dom'

const MOBILE_ITEMS = [
  { to: '/overview', icon: 'dashboard', label: 'Panel' },
  { to: '/cultivation/recipes', icon: 'potted_plant', label: 'Cultivo' },
  { to: '/operations/alarms', icon: 'warning', label: 'Alertas' },
  { to: '/system/settings', icon: 'settings', label: 'Sistema' },
]

function BottomNav() {
  return (
    <nav className="bottom-nav">
      {MOBILE_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="material-symbols-outlined">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default BottomNav
