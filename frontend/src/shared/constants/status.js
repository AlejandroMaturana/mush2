export const STATUS_LABELS = {
  ONLINE: 'En línea',
  OFFLINE: 'Fuera de línea',
  MAINTENANCE: 'Mantenimiento',
  ERROR: 'Error',
}

export const SEVERITY_LABELS = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
}

export const SEVERITY_COLORS = {
  CRITICAL: 'text-error',
  HIGH: 'text-warning',
  MEDIUM: 'text-info',
  LOW: 'text-on-surface-variant',
}

export const PHASE_LABELS = {
  INCUBATION: 'Incubación',
  FRUITING: 'Fructificación',
  MAINTENANCE: 'Mantenimiento',
  COMPLETED: 'Completada',
}

export const CYCLE_STATUS_LABELS = {
  PLANNED: 'Planificado',
  ACTIVE: 'Activo',
  COMPLETED: 'Completado',
  ABORTED: 'Cancelado',
}

export const DIFFICULTY_LABELS = {
  BEGINNER: { label: 'Principiante', color: 'text-green-500', icon: 'signal_1' },
  INTERMEDIATE: { label: 'Intermedio', color: 'text-amber-500', icon: 'signal_2' },
  ADVANCED: { label: 'Avanzado', color: 'text-red-500', icon: 'signal_3' },
}

export const ADAPTER_CLASS_LABELS = {
  ADAPTOGEN: { label: 'Adaptógeno', color: 'text-purple-400' },
  EDIBLE: { label: 'Comestible', color: 'text-green-400' },
  MEDICINAL: { label: 'Medicinal', color: 'text-blue-400' },
}

export const ROLE_LABELS = {
  SUPER_ADMIN: { label: 'Administrador Principal', color: 'text-purple-400' },
  ADMIN: { label: 'Administrador', color: 'text-blue-400' },
  OPERATOR: { label: 'Operador', color: 'text-green-400' },
  VIEWER: { label: 'Observador', color: 'text-gray-400' },
}
