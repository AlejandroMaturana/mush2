import { NavLink, Link } from 'react-router-dom'
import AlarmBadge from '../alarm/AlarmBadge.jsx'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/cycles', label: 'Cycles' },
  { to: '/settings', label: 'Settings' },
]

function TopBar({ user, onLogout }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <Link to="/dashboard" className="topbar-brand">Mush2</Link>
        <nav className="topbar-nav">
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `topbar-link${isActive ? ' active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="topbar-right">
        <AlarmBadge />
        {user && (
          <div className="topbar-user">
            <span className="user-avatar">{user.username?.charAt(0).toUpperCase()}</span>
            <button className="logout-btn" onClick={onLogout}>Salir</button>
          </div>
        )}
      </div>
    </header>
  )
}

export default TopBar
