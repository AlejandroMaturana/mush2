import { NavLink } from 'react-router-dom'

const PRIMARY_ITEMS = [
  { to: '/', icon: 'hub', label: 'Home' },
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/recipes', icon: 'potted_plant', label: 'Recipes' },
  { to: '/cycles', icon: 'cyclone', label: 'Cycles' },
]

const SYSTEM_ITEMS = [
  { to: '/settings', icon: 'settings', label: 'System' },
]

const BOTTOM_ITEMS = [
  { icon: 'help', label: '' },
  { icon: 'terminal', label: '' },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-nav">
        {PRIMARY_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `sidebar-item${isActive ? ' active' : ''}`
            }
          >
            <span className="material-symbols-outlined sidebar-icon">{item.icon}</span>
            {item.label && <span className="sidebar-label">{item.label}</span>}
          </NavLink>
        ))}
        <div className="sidebar-divider" />
        {SYSTEM_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-item${isActive ? ' active' : ''}`
            }
          >
            <span className="material-symbols-outlined sidebar-icon">{item.icon}</span>
            {item.label && <span className="sidebar-label">{item.label}</span>}
          </NavLink>
        ))}
      </div>
      <div className="sidebar-bottom">
        {BOTTOM_ITEMS.map((item, i) => (
          <button key={i} className="sidebar-item sidebar-bottom-item">
            <span className="material-symbols-outlined sidebar-icon">{item.icon}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

export default Sidebar
