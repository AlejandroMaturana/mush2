import { NavLink } from 'react-router-dom'
import { useAlarms } from '../../app/providers/AlarmProvider'
import { NAV_SECTIONS } from '../../shared/constants/navigation'

const sidebarNavStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  flex: 1,
}

const sidebarSectionStyle = {
  marginTop: '10px',
}

const sidebarSectionLabelStyle = {
  fontSize: '9px',
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  padding: '0 16px',
  marginBottom: '4px',
}

function Sidebar() {
  const stats = useAlarms()
  const activeCount = stats?.total || 0

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--spore-green)' }}>grain</span>
        <span className="sidebar-brand-text">Mush2</span>
      </div>

      <nav className="sidebar-nav" style={sidebarNavStyle}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={sidebarSectionStyle}>
            <div style={sidebarSectionLabelStyle}>{section.label}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-item${isActive ? ' active' : ''}`
                }
              >
                <span className="material-symbols-outlined sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
                {item.hasBadge && activeCount > 0 && (
                  <span className="sidebar-badge">{activeCount > 99 ? '99+' : activeCount}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>v2.0.0</span>
      </div>
    </aside>
  )
}

export default Sidebar
