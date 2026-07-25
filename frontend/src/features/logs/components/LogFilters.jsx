import FilterBar from '../../../shared/components/FilterBar'

const RESOURCES = ['', 'user', 'device', 'sensor', 'actuator', 'recipe', 'cycle', 'alarm', 'api_key', 'system']
const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'USER_ROLE_CHANGE', 'USER_TOGGLE_ACTIVE', 'API_KEY_CREATE', 'API_KEY_REVOKE', 'API_KEY_ROTATE', 'PASSWORD_CHANGE']

function LogFilters({ filters, onChange }) {
  return (
    <FilterBar>
      <FilterBar.Field label="Buscar">
        <input
          type="text"
          className="input"
          placeholder="Buscar registros..."
          value={filters.search || ''}
          onChange={e => onChange({ ...filters, search: e.target.value })}
        />
      </FilterBar.Field>
      <FilterBar.Field label="Recurso">
        <select className="select" value={filters.resource || ''} onChange={e => onChange({ ...filters, resource: e.target.value })}>
          {RESOURCES.map(r => <option key={r} value={r}>{r || 'Todos los recursos'}</option>)}
        </select>
      </FilterBar.Field>
      <FilterBar.Field label="Acción">
        <select className="select" value={filters.action || ''} onChange={e => onChange({ ...filters, action: e.target.value })}>
          {ACTIONS.map(a => <option key={a} value={a}>{a || 'Todas las acciones'}</option>)}
        </select>
      </FilterBar.Field>
      <FilterBar.Field label="Desde">
        <input type="date" className="input" value={filters.from || ''} onChange={e => onChange({ ...filters, from: e.target.value })} />
      </FilterBar.Field>
      <FilterBar.Field label="Hasta">
        <input type="date" className="input" value={filters.to || ''} onChange={e => onChange({ ...filters, to: e.target.value })} />
      </FilterBar.Field>
    </FilterBar>
  )
}

export default LogFilters
