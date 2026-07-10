import { NavLink } from 'react-router-dom'

const PRIMARY_ITEMS = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/recipes', icon: 'potted_plant', label: 'Recipes' },
  { to: '/cycles', icon: 'cyclone', label: 'Cycles' },
]

const SYSTEM_ITEMS = [
  { to: '/alarms', icon: 'warning', label: 'Alarms' },
  { to: '/settings', icon: 'settings', label: 'System' },
  { to: '/provisioning', icon: 'bluetooth', label: 'Provision' },
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
      <div className="sidebar-bottom" />
    </aside>
  )
}

export default Sidebar
