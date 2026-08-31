/**
 * Camera Status Semantics — D2 (M0.2 §6/§7/§8/§9)
 *
 * Única fuente de verdad para la derivación del estado principal de cámara.
 * A partir del status compuesto que ya produce `computeStatus` en
 * `deviceHealthService.js` ({ connectivity, health, lifecycle }), deriva:
 *
 *   primaryStatus    — uno de los 6 estados aprobados + centinela de datos ausentes.
 *   primaryLabel     — copy corto legible (M0.2 §8).
 *   primaryReason    — causa dominante legible.
 *   secondaryStates  — desglose por ejes (value técnico + label humano).
 *
 * Precedencia (M0.2 §6): Lifecycle terminal/mantenimiento → Conectividad → Salud → Default.
 * El frontend CONSUME estos campos sin reimplementar la precedencia (M0.2 §3/§9).
 */

export const DATOS_NO_DISPONIBLES = 'DATOS_NO_DISPONIBLES';

export const PRIMARY_STATES = {
  OPERATIVA: 'OPERATIVA',
  SIN_CONEXION: 'SIN CONEXIÓN',
  EN_MANTENIMIENTO: 'EN MANTENIMIENTO',
  AVISO: 'AVISO',
  PROVISIONANDO: 'PROVISIONANDO',
  RETIRADA: 'RETIRADA',
};

// ── Labels técnico → humano (M0.2 §8 / §11 secundario) ──────────────

const LIFECYCLE_LABEL = {
  ACTIVE: 'En servicio',
  PROVISIONING: 'Aprovisionando',
  MAINTENANCE: 'En mantenimiento',
  RETIRED: 'Retirada',
};

const CONNECTIVITY_LABEL = {
  ONLINE: 'En línea',
  DEGRADED: 'Degradada',
  OFFLINE: 'Sin conexión',
};

const HEALTH_LABEL = {
  NORMAL: 'Saludable',
  WARNING: 'Advertencia',
  ERROR: 'Error',
};

const PRIMARY_LABEL = {
  OPERATIVA: 'Operativa',
  'SIN CONEXIÓN': 'Sin conexión',
  'EN MANTENIMIENTO': 'En mantenimiento',
  AVISO: 'Aviso',
  PROVISIONANDO: 'Aprovisionando',
  RETIRADA: 'Retirada',
  [DATOS_NO_DISPONIBLES]: 'Datos no disponibles',
};

// ── Causas concretas derivadas del DeviceHealth (para primaryReason) ─

function healthReasonCauses(latestHealth) {
  if (!latestHealth) return [];
  const causes = [];
  if (latestHealth.sensorAht21 === false) causes.push('sensor de temperatura/humedad con anomalía');
  if (latestHealth.sensorEns160 === false) causes.push('sensor de aire (CO₂/VOC) con anomalía');
  if (latestHealth.i2cHealthy === false) causes.push('fallo de comunicación con los sensores');
  if (latestHealth.heartbeatsHealthy === false) causes.push('la cámara no confirma su funcionamiento');
  if (latestHealth.bootTestPassed === false) causes.push('fallo al encender');
  if (latestHealth.staleTaskMask > 0) causes.push('tareas internas atascadas');
  if (latestHealth.freeHeap != null && latestHealth.freeHeap < 30000) causes.push('memoria baja');
  return causes;
}

// ── Derivación del primario (regla de precedencia) ──────────────────

function derivePrimaryStatus(status, extra = {}) {
  // Fila 15 (M0.2 §6): sin status → centinela, nunca `—` crudo.
  if (!status || typeof status !== 'object') {
    return {
      primaryStatus: DATOS_NO_DISPONIBLES,
      primaryLabel: PRIMARY_LABEL[DATOS_NO_DISPONIBLES],
      primaryReason: 'No hay datos de estado disponibles.',
      secondaryStates: { lifecycle: null, connectivity: null, health: null },
    };
  }

  const { lifecycle, connectivity, health } = status;
  const latestHealth = extra && extra.health;

  // 1. Lifecycle terminal / mantenimiento (M0.2 §6 filas 8-11).
  if (lifecycle === 'PROVISIONING') {
    return {
      primaryStatus: PRIMARY_STATES.PROVISIONANDO,
      primaryLabel: PRIMARY_LABEL[PRIMARY_STATES.PROVISIONANDO],
      primaryReason: 'La cámara aún no ha enviado su primera transmisión.',
      secondaryStates: secondaryStatesOf({ lifecycle, connectivity, health }),
    };
  }
  if (lifecycle === 'RETIRED') {
    return {
      primaryStatus: PRIMARY_STATES.RETIRADA,
      primaryLabel: PRIMARY_LABEL[PRIMARY_STATES.RETIRADA],
      primaryReason: 'La cámara fue retirada de forma permanente.',
      secondaryStates: secondaryStatesOf({ lifecycle, connectivity, health }),
    };
  }
  if (lifecycle === 'MAINTENANCE') {
    return {
      primaryStatus: PRIMARY_STATES.EN_MANTENIMIENTO,
      primaryLabel: PRIMARY_LABEL[PRIMARY_STATES.EN_MANTENIMIENTO],
      primaryReason: 'La cámara está en mantenimiento manual.',
      secondaryStates: secondaryStatesOf({ lifecycle, connectivity, health }),
    };
  }

  // 2. Conectividad OFFLINE (fila 7): SIN CONEXIÓN, domina a salud.
  if (connectivity === 'OFFLINE') {
    return {
      primaryStatus: PRIMARY_STATES.SIN_CONEXION,
      primaryLabel: PRIMARY_LABEL[PRIMARY_STATES.SIN_CONEXION],
      primaryReason: 'La cámara no está transmitiendo desde hace un rato.',
      secondaryStates: secondaryStatesOf({ lifecycle, connectivity, health }),
    };
  }

  // 3. Umbrella AVISO: any anomalía (DEGRADED, WARNING, ERROR).
  const hasAnomaly = connectivity === 'DEGRADED' || health === 'WARNING' || health === 'ERROR';
  if (hasAnomaly) {
    return {
      primaryStatus: PRIMARY_STATES.AVISO,
      primaryLabel: PRIMARY_LABEL[PRIMARY_STATES.AVISO],
      primaryReason: buildAvisoReason({ connectivity, health }, latestHealth),
      secondaryStates: secondaryStatesOf({ lifecycle, connectivity, health }),
    };
  }

  // 4. Datos parciales con lifecycle ACTIVE (filas 12/13/14, resoltas en §7/§8).
  //    connectivity aquí es ONLINE o null (OFFLINE/DEGRADED ya cubiertos).
  if (connectivity === 'ONLINE') {
    // Fila 13 (Q1 default): ONLINE + salud desconocida → OPERATIVA + nota.
    if (health === null || health === undefined) {
      return {
        primaryStatus: PRIMARY_STATES.OPERATIVA,
        primaryLabel: PRIMARY_LABEL[PRIMARY_STATES.OPERATIVA],
        primaryReason: 'Conectada, pero su salud aún no evaluada.',
        secondaryStates: secondaryStatesOf({ lifecycle, connectivity, health }),
      };
    }
    // health es NORMAL → OPERATIVA (fila 1).
    return {
      primaryStatus: PRIMARY_STATES.OPERATIVA,
      primaryLabel: PRIMARY_LABEL[PRIMARY_STATES.OPERATIVA],
      primaryReason: null,
      secondaryStates: secondaryStatesOf({ lifecycle, connectivity, health }),
    };
  }

  // connectivity === null (no probado). health no es anomalía aquí.
  if (health === 'NORMAL') {
    // Fila 14: no hay datos de conectividad → AVISO.
    return {
      primaryStatus: PRIMARY_STATES.AVISO,
      primaryLabel: PRIMARY_LABEL[PRIMARY_STATES.AVISO],
      primaryReason: 'No hay datos de conectividad para evaluar la cámara.',
      secondaryStates: secondaryStatesOf({ lifecycle, connectivity, health }),
    };
  }

  // Fila 12: connectividad null + salud null → AVISO (datos incompletos).
  return {
    primaryStatus: PRIMARY_STATES.AVISO,
    primaryLabel: PRIMARY_LABEL[PRIMARY_STATES.AVISO],
    primaryReason: 'No hay datos suficientes para evaluar la cámara.',
    secondaryStates: secondaryStatesOf({ lifecycle, connectivity, health }),
  };
}

function buildAvisoReason({ connectivity, health }, latestHealth) {
  const parts = [];
  if (connectivity === 'DEGRADED') parts.push('señal intermitente');

  if (health === 'WARNING' || health === 'ERROR') {
    const causes = healthReasonCauses(latestHealth);
    if (causes.length > 0) parts.push(...causes);
    else parts.push(health === 'ERROR' ? 'fallo de salud' : 'anomalía de salud');
  }

  return parts.length > 0 ? parts.join(' · ') : 'anomalía';
}

function secondaryStatesOf({ lifecycle, connectivity, health }) {
  return {
    lifecycle: lifecycle ? { value: lifecycle, label: LIFECYCLE_LABEL[lifecycle] || lifecycle } : null,
    connectivity: connectivity ? { value: connectivity, label: CONNECTIVITY_LABEL[connectivity] || connectivity } : null,
    health: health ? { value: health, label: HEALTH_LABEL[health] || health } : null,
  };
}

// ── Exports ──────────────────────────────────────────────────────────

export {
  derivePrimaryStatus,
  LIFECYCLE_LABEL,
  CONNECTIVITY_LABEL,
  HEALTH_LABEL,
  PRIMARY_LABEL,
};
