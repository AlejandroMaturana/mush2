import { useState } from 'react'

function Panel({ title, subtitle, collapsible = false, defaultCollapsed = false, headerActions, footer, children, variant = 'default', className = '' }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const classes = [
    'panel',
    variant !== 'default' && `panel-${variant}`,
    collapsed && 'panel-collapsed',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      <div className="panel-header">
        <div className="panel-header-text">
          <h3 className="panel-title">{title}</h3>
          {subtitle && <span className="panel-subtitle">{subtitle}</span>}
        </div>
        <div className="panel-header-actions">
          {headerActions}
          {collapsible && (
            <button
              className="btn-icon btn-sm"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expandir' : 'Contraer'}
            >
              <span className="material-symbols-outlined">
                {collapsed ? 'expand_more' : 'expand_less'}
              </span>
            </button>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="panel-body">
          {children}
        </div>
      )}
      {footer && !collapsed && (
        <div className="panel-footer">
          {footer}
        </div>
      )}
    </div>
  )
}

export default Panel
