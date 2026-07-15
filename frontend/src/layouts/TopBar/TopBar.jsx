import { useLocation } from 'react-router-dom'
import { useAuth } from '../../app/providers/AuthProvider'
import { useAlarms } from '../../app/providers/AlarmProvider'
import { useTheme } from '../../app/providers/ThemeProvider'

const PAGE_TITLES = {
  '/overview': 'Overview',
  '/fleet/provision': 'Provisioning',
  '/cultivation/recipes': 'Recipes',
  '/cultivation/recipes/compare': 'Recipe Comparator',
  '/cultivation/species': 'Species Library',
  '/cultivation/cycles': 'Cycles',
  '/operations/analytics': 'Analytics',
  '/operations/alarms': 'Alarms',
  '/operations/logs': 'Audit Log',
  '/operations/diagnostics': 'Diagnostics',
  '/system/settings': 'Settings',
}

function TopBar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const stats = useAlarms()
  const activeCount = stats?.total || 0
  const { isDark, toggleTheme } = useTheme()

  const title = Object.entries(PAGE_TITLES).find(
    ([path]) => location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] || 'Mush2'

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-brand">{title}</h1>
      </div>
      <div className="topbar-right">
        {activeCount > 0 && (
          <button className="btn btn-ghost btn-sm" style={{ position: 'relative', gap: '6px' }}>
            <span className="material-symbols-outlined text-16px">notifications</span>
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              minWidth: '16px',
              height: '16px',
              padding: '0 4px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--error-red)',
              color: 'var(--on-error)',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}>{activeCount > 99 ? '99+' : activeCount}</span>
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          <span className="material-symbols-outlined text-16px">{isDark ? 'light_mode' : 'dark_mode'}</span>
        </button>
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
