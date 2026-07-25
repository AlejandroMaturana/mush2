import { useState } from 'react'

function Explorer({ title, count, searchValue, onSearchChange, searchPlaceholder = 'Buscar...', filters, children, actions }) {
  return (
    <div className="explorer">
      <div className="explorer-header">
        <div className="explorer-title-row">
          <h2 className="explorer-title">{title}</h2>
          {count !== undefined && <span className="explorer-count">{count}</span>}
          <div className="explorer-actions">
            {actions}
          </div>
        </div>
        <div className="explorer-toolbar">
          {onSearchChange && (
            <div className="explorer-search">
              <span className="material-symbols-outlined explorer-search-icon">search</span>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="explorer-search-input"
              />
              {searchValue && (
                <button
                  className="explorer-search-clear"
                  onClick={() => onSearchChange('')}
                  aria-label="Limpiar búsqueda"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>
          )}
          {filters}
        </div>
      </div>
      <div className="explorer-body">
        {children}
      </div>
    </div>
  )
}

export default Explorer
