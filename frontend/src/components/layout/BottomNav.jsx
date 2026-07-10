import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dash' },
  { to: '/recipes', icon: 'potted_plant', label: 'Recipes' },
  { to: '/cycles', icon: 'cyclone', label: 'Cycles' },
  { to: '/alarms', icon: 'warning', label: 'Alarms' },
  { to: '/settings', icon: 'settings', label: 'System' },
]

function BottomNav() {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={false}
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
