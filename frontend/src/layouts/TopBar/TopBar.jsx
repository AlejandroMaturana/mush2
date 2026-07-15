import { useLocation } from 'react-router-dom'
import { useAuth } from '../../app/providers/AuthProvider'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/recipes': 'Recetas',
  '/recipes/compare': 'Comparador',
  '/species': 'Especies',
  '/cycles': 'Ciclos',
  '/analytics': 'Analytics',
  '/alarms': 'Alarms',
  '/logs': 'Audit Log',
  '/diagnostics': 'Diagnostics',
  '/settings': 'Settings',
  '/provisioning': 'Provisioning',
}

function TopBar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const title = Object.entries(PAGE_TITLES).find(
    ([path]) => location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] || 'Mush2'

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-right">
        {user && (
          <div className="topbar-user">
            <span className="user-avatar">{user.username?.charAt(0).toUpperCase()}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              <span className="material-symbols-outlined text-16px">logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default TopBar
