import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', icon: 'hub', label: 'Home' },
  { to: '/dashboard', icon: 'dashboard', label: 'Dash' },
  { to: '/recipes', icon: 'potted_plant', label: 'Farm' },
  { to: '/cycles', icon: 'cyclone', label: 'Cyc' },
  { to: '/settings', icon: 'settings', label: 'Sys' },
]

function BottomNav() {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
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
