export const NAV_SECTIONS = [
  {
    id: 'overview',
    label: 'VISTA GENERAL',
    standalone: true,
    items: [
      { to: '/overview', icon: 'dashboard', label: 'Panel de control' },
    ],
  },
  {
    id: 'fleet',
    label: 'DISPOSITIVOS',
    icon: 'devices',
    collapsible: true,
    items: [
      { to: '/fleet/devices', icon: 'devices', label: 'Cámaras de cultivo' },
      { to: '/fleet/provision', icon: 'bluetooth', label: 'Aprovisionamiento' },
    ],
  },
  {
    id: 'cultivation',
    label: 'CULTIVO',
    icon: 'potted_plant',
    collapsible: true,
    items: [
      { to: '/cultivation/recipes', icon: 'science', label: 'Recetas' },
      { to: '/cultivation/species', icon: 'biotech', label: 'Especies' },
      { to: '/cultivation/cycles', icon: 'cyclone', label: 'Ciclos' },
    ],
  },
  {
    id: 'operations',
    label: 'OPERACIONES',
    icon: 'monitoring',
    collapsible: true,
    items: [
      { to: '/operations/analytics', icon: 'analytics', label: 'Analítica' },
      { to: '/operations/alarms', icon: 'warning', label: 'Alertas', hasBadge: true },
      { to: '/operations/events', icon: 'bolt', label: 'Eventos' },
      { to: '/operations/logs', icon: 'history', label: 'Registro de auditoría' },
      { to: '/operations/diagnostics', icon: 'diagnosis', label: 'Diagnóstico' },
    ],
  },
  {
    id: 'system',
    label: 'SISTEMA',
    icon: 'settings',
    collapsible: true,
    items: [
      { to: '/system/settings', icon: 'tune', label: 'Configuración' },
    ],
  },
]
