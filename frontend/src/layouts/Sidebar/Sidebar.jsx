import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAlarms } from '../../app/providers/AlarmProvider'
import { NAV_SECTIONS } from '../../shared/constants/navigation'
import { useVersionManifest } from '../../shared/hooks/useVersionManifest'

function Sidebar() {
  const stats = useAlarms()
  const activeCount = stats?.total || 0
  const location = useLocation()
  const manifest = useVersionManifest()

  const [expanded, setExpanded] = useState(() => {
    const initial = {}
    NAV_SECTIONS.forEach((s) => {
      if (s.collapsible) initial[s.id] = false
    })
    return initial
  })

  useEffect(() => {
    NAV_SECTIONS.forEach((section) => {
      if (!section.collapsible) return
      const match = section.items.some(
        (item) => location.pathname === item.to || location.pathname.startsWith(item.to + '/')
      )
      if (match) setExpanded((prev) => ({ ...prev, [section.id]: true }))
    })
  }, [location.pathname])

  function toggleSection(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand" style={{ marginBottom: '8px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--spore-green)' }}>grain</span>
        <span className="topbar-brand" style={{ fontSize: '16px' }}>Mush2</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section, idx) => {
          if (section.standalone) {
            return (
              <div key={section.id} className="sidebar-section">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                  >
                    <span className="material-symbols-outlined sidebar-icon">{item.icon}</span>
                    <span className="sidebar-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )
          }

          const isExpanded = expanded[section.id]

          return (
            <div key={section.id} className="sidebar-section">
              <button
                className="sidebar-section-header"
                onClick={() => toggleSection(section.id)}
                aria-expanded={isExpanded}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', opacity: 0.7 }}>{section.icon}</span>
                  <span className="sidebar-section-label">{section.label}</span>
                </div>
                <span className={`material-symbols-outlined sidebar-chevron${isExpanded ? ' expanded' : ''}`} style={{ fontSize: '14px' }}>
                  expand_more
                </span>
              </button>

              <div className={`sidebar-section-items${isExpanded ? ' open' : ''}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '4px' }}>
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                    >
                      <span className="material-symbols-outlined sidebar-icon">{item.icon}</span>
                      <span className="sidebar-label">{item.label}</span>
                      {item.hasBadge && activeCount > 0 && (
                        <span className="sidebar-alarm-badge">
                          {activeCount > 99 ? '99+' : activeCount}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 0',
        borderTop: '1px solid var(--outline-variant)',
        marginTop: '8px',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--spore-green)', opacity: 0.6 }}>grain</span>
        <span className="form-label">{manifest ? `v${manifest.system.version}` : ''}</span>
      </div>
    </aside>
  )
}

export default Sidebar
