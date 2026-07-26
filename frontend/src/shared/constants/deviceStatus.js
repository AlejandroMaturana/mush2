/**
 * Device Status Policy — Fuente única de verdad (DDD-008 / ADR-025)
 *
 * Modelo multidimensional compuesto:
 *   { connectivity, health, lifecycle }
 *
 * Este archivo define la representación visual de cada valor
 * de cada dimensión. Todos los componentes deben importar de aquí.
 */

// ── Dimension value types ──────────────────────────────────────────

export const CONNECTIVITY = {
  ONLINE: 'ONLINE',
  DEGRADED: 'DEGRADED',
  OFFLINE: 'OFFLINE',
};

export const HEALTH_CONDITION = {
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
};

export const LIFECYCLE = {
  ACTIVE: 'ACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  RETIRED: 'RETIRED',
};

// ── Connectivity visual config ─────────────────────────────────────

export const CONNECTIVITY_CONFIG = {
  ONLINE: {
    label: 'En línea',
    color: 'var(--spore-green)',
    bg: 'rgba(var(--spore-green-rgb),0.1)',
    border: 'rgba(var(--spore-green-rgb),0.3)',
    icon: 'wifi',
    cssClass: 'online',
    tooltip: 'Dispositivo comunicando dentro del intervalo de heartbeat',
  },
  DEGRADED: {
    label: 'Degradado',
    color: 'var(--amber)',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    icon: 'wifi_off',
    cssClass: 'warning',
    tooltip: 'Comunicación intermitente o retrasada',
  },
  OFFLINE: {
    label: 'Fuera de línea',
    color: 'var(--error-red)',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
    icon: 'wifi_off',
    cssClass: 'offline',
    tooltip: 'Sin comunicación por tiempo prolongado',
  },
};

// ── Health condition visual config ─────────────────────────────────

export const HEALTH_CONFIG = {
  NORMAL: {
    label: 'Saludable',
    color: 'var(--spore-green)',
    bg: 'rgba(var(--spore-green-rgb),0.1)',
    border: 'rgba(var(--spore-green-rgb),0.3)',
    icon: 'check_circle',
    cssClass: 'online',
    tooltip: 'Todos los subsistemas operativos',
  },
  WARNING: {
    label: 'Advertencia',
    color: 'var(--amber)',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    icon: 'warning',
    cssClass: 'warning',
    tooltip: 'Condiciones de advertencia en subsistemas',
  },
  ERROR: {
    label: 'Error',
    color: 'var(--error-red)',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
    icon: 'error',
    cssClass: 'error',
    tooltip: 'Fallo de hardware detectado',
  },
};

// ── Lifecycle visual config ────────────────────────────────────────

export const LIFECYCLE_CONFIG = {
  PROVISIONING: {
    label: 'Aprovisionando',
    color: 'var(--outline)',
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.1)',
    icon: 'bluetooth',
    cssClass: 'offline',
    tooltip: 'Dispositivo registrado pero sin comunicación inicial',
  },
  ACTIVE: {
    label: 'Activo',
    color: 'var(--spore-green)',
    bg: 'rgba(var(--spore-green-rgb),0.1)',
    border: 'rgba(var(--spore-green-rgb),0.3)',
    icon: 'radio_button_checked',
    cssClass: 'online',
    tooltip: 'Dispositivo en operación normal',
  },
  MAINTENANCE: {
    label: 'Mantenimiento',
    color: 'var(--info)',
    bg: 'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.3)',
    icon: 'build',
    cssClass: 'info',
    tooltip: 'Mantenimiento manual activo',
  },
  RETIRED: {
    label: 'Retirado',
    color: 'var(--outline)',
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.1)',
    icon: 'power_off',
    cssClass: 'offline',
    tooltip: 'Dispositivo permanentemente retirado',
  },
};

// ── Primary badge resolution ───────────────────────────────────────

/**
 * Determines which dimension to show as the primary badge.
 * Precedence (ADR-025): Lifecycle > Connectivity > Health
 */
export function getPrimaryStatus(status) {
  if (!status) return { key: 'UNKNOWN', config: { label: 'Desconocido', color: 'var(--outline)', cssClass: 'offline', icon: 'help' } };

  const { lifecycle, connectivity, health } = status;

  if (lifecycle === 'PROVISIONING') return { key: 'PROVISIONING', config: LIFECYCLE_CONFIG.PROVISIONING };
  if (lifecycle === 'RETIRED') return { key: 'RETIRED', config: LIFECYCLE_CONFIG.RETIRED };
  if (lifecycle === 'MAINTENANCE') return { key: 'MAINTENANCE', config: LIFECYCLE_CONFIG.MAINTENANCE };

  if (connectivity === 'OFFLINE') return { key: 'OFFLINE', config: CONNECTIVITY_CONFIG.OFFLINE };
  if (health === 'ERROR') return { key: 'ERROR', config: HEALTH_CONFIG.ERROR };
  if (connectivity === 'DEGRADED') return { key: 'DEGRADED', config: CONNECTIVITY_CONFIG.DEGRADED };
  if (health === 'WARNING') return { key: 'WARNING', config: HEALTH_CONFIG.WARNING };
  if (connectivity === 'ONLINE') return { key: 'ONLINE', config: CONNECTIVITY_CONFIG.ONLINE };

  return { key: 'UNKNOWN', config: { label: 'Desconocido', color: 'var(--outline)', cssClass: 'offline', icon: 'help' } };
}

/**
 * Returns a compact summary string for the status.
 */
export function getStatusSummary(status) {
  if (!status) return 'Sin datos';
  const primary = getPrimaryStatus(status);
  const parts = [primary.config.label];

  if (status.health && status.health !== 'NORMAL' && primary.key !== 'ERROR' && primary.key !== 'WARNING') {
    parts.push(HEALTH_CONFIG[status.health]?.label || status.health);
  }

  return parts.join(' · ');
}

/**
 * Returns the CSS class for a status dot/badge based on the composed status.
 */
export function getStatusCssClass(status) {
  const primary = getPrimaryStatus(status);
  return primary.config.cssClass;
}
