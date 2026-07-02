import { NavLink, Link } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/cycles', label: 'Cycles' },
  { to: '/settings', label: 'Settings' },
]

function TopBar({ user, onLogout }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <Link to="/" className="topbar-brand">Mush2</Link>
        <nav className="topbar-nav">
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
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
        <button className="topbar-icon-btn" title="Notifications">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="topbar-icon-btn" title="Settings">
          <span className="material-symbols-outlined">settings</span>
        </button>
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
