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

  const [openSection, setOpenSection] = useState(null)

  useEffect(() => {
    NAV_SECTIONS.forEach((section) => {
      if (!section.collapsible) return
      const match = section.items.some(
        (item) => location.pathname === item.to || location.pathname.startsWith(item.to + '/')
      )
      if (match) setOpenSection(section.id)
    })
  }, [location.pathname])

  function toggleSection(id) {
    setOpenSection((prev) => (prev === id ? null : id))
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="material-symbols-outlined sidebar-brand-icon">grain</span>
        <span className="sidebar-brand-name">Mush2</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => {
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

          const isExpanded = openSection === section.id

          return (
            <div key={section.id} className="sidebar-section">
              <button
                className="sidebar-section-header"
                onClick={() => toggleSection(section.id)}
                aria-expanded={isExpanded}
              >
                <div className="sidebar-section-header-content">
                  <span className="material-symbols-outlined sidebar-section-icon">{section.icon}</span>
                  <span>{section.label}</span>
                </div>
                <span className={`material-symbols-outlined sidebar-chevron${isExpanded ? ' expanded' : ''}`}>
                  expand_more
                </span>
              </button>

              <div className={`sidebar-section-items${isExpanded ? ' open' : ''}`}>
                <div className="sidebar-section-items-inner">
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

      <div className="sidebar-footer">
        <span className="material-symbols-outlined sidebar-footer-icon">grain</span>
        <span className="sidebar-footer-version">{manifest ? `MUSH2 OS v${manifest.system.version}` : ''}</span>
      </div>
    </aside>
  )
}

export default Sidebar
