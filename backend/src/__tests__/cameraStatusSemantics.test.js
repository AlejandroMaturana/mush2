import { derivePrimaryStatus, DATOS_NO_DISPONIBLES } from '../services/cameraStatusSemantics.js';

// Valores reales del status compuesto (computeStatus).
const ACTIVE = 'ACTIVE';
const MAINTENANCE = 'MAINTENANCE';
const RETIRED = 'RETIRED';
const PROVISIONING = 'PROVISIONING';

const CONN_ONLINE = 'ONLINE';
const CONN_DEGRADED = 'DEGRADED';
const CONN_OFFLINE = 'OFFLINE';

const HEALTH_NORMAL = 'NORMAL';
const HEALTH_WARNING = 'WARNING';
const HEALTH_ERROR = 'ERROR';

// Helpers para construir un status compuesto real.
function status({ lifecycle = ACTIVE, connectivity = null, health = null } = {}) {
  return { lifecycle, connectivity, health };
}

function healthRecord(overrides = {}) {
  return {
    i2cHealthy: true,
    sensorAht21: true,
    sensorEns160: true,
    heartbeatsHealthy: true,
    bootTestPassed: true,
    staleTaskMask: 0,
    freeHeap: 50000,
    ...overrides,
  };
}

describe('cameraStatusSemantics — derivePrimaryStatus', () => {
  describe('§6 Decision Table — 15 filas', () => {
    // Fila 1: ACTIVE + ONLINE + NORMAL → OPERATIVA (caso nominal)
    it('fila 1: ACTIVE ON LINE NORMAL → OPERATIVA', () => {
      const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: CONN_ONLINE, health: HEALTH_NORMAL }));
      expect(r.primaryStatus).toBe('OPERATIVA');
      expect(r.primaryLabel).toBe('Operativa');
    });

    // Fila 2: ACTIVE + ONLINE + WARNING → AVISO
    it('fila 2: ACTIVE ONLINE WARNING → AVISO', () => {
      const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: CONN_ONLINE, health: HEALTH_WARNING }));
      expect(r.primaryStatus).toBe('AVISO');
    });

    // Fila 3: ACTIVE + ONLINE + ERROR → AVISO
    it('fila 3: ACTIVE ONLINE ERROR → AVISO', () => {
      const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: CONN_ONLINE, health: HEALTH_ERROR }));
      expect(r.primaryStatus).toBe('AVISO');
    });

    // Fila 4: ACTIVE + DEGRADED + NORMAL → AVISO (señal intermitente)
    it('fila 4: ACTIVE DEGRADED NORMAL → AVISO', () => {
      const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: CONN_DEGRADED, health: HEALTH_NORMAL }));
      expect(r.primaryStatus).toBe('AVISO');
      expect(r.primaryReason).toContain('señal intermitente');
    });

    // Fila 5: ACTIVE + DEGRADED + WARNING → AVISO
    it('fila 5: ACTIVE DEGRADED WARNING → AVISO', () => {
      const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: CONN_DEGRADED, health: HEALTH_WARNING }));
      expect(r.primaryStatus).toBe('AVISO');
    });

    // Fila 6: ACTIVE + DEGRADED + ERROR → AVISO
    it('fila 6: ACTIVE DEGRADED ERROR → AVISO', () => {
      const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: CONN_DEGRADED, health: HEALTH_ERROR }));
      expect(r.primaryStatus).toBe('AVISO');
    });

    // Fila 7: ACTIVE + OFFLINE + (cualquiera/null) → SIN CONEXIÓN
    it('fila 7: ACTIVE OFFLINE → SIN CONEXIÓN (ignora salud)', () => {
      for (const health of [HEALTH_NORMAL, HEALTH_WARNING, HEALTH_ERROR, null]) {
        const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: CONN_OFFLINE, health }));
        expect(r.primaryStatus).toBe('SIN CONEXIÓN');
      }
    });

    // Fila 8: MAINTENANCE + null/null → EN MANTENIMIENTO
    it('fila 8: MAINTENANCE → EN MANTENIMIENTO', () => {
      const r = derivePrimaryStatus(status({ lifecycle: MAINTENANCE, connectivity: null, health: null }));
      expect(r.primaryStatus).toBe('EN MANTENIMIENTO');
    });

    // Fila 9: MAINTENANCE (conectividad/salud no se computan)
    it('fila 9: MAINTENANCE nunca se oculta por conectividad/salud', () => {
      const r = derivePrimaryStatus(status({ lifecycle: MAINTENANCE, connectivity: CONN_ONLINE, health: HEALTH_NORMAL }));
      expect(r.primaryStatus).toBe('EN MANTENIMIENTO');
    });

    // Fila 10: RETIRED → RETIRADA (nunca oculto por conectividad/salud)
    it('fila 10: RETIRED → RETIRADA', () => {
      const r = derivePrimaryStatus(status({ lifecycle: RETIRED, connectivity: null, health: null }));
      expect(r.primaryStatus).toBe('RETIRADA');
      expect(r.primaryLabel).toBe('Retirada');
    });

    // Fila 11: PROVISIONING → PROVISIONANDO
    it('fila 11: PROVISIONING → PROVISIONANDO', () => {
      const r = derivePrimaryStatus(status({ lifecycle: PROVISIONING, connectivity: null, health: null }));
      expect(r.primaryStatus).toBe('PROVISIONANDO');
    });

    // Fila 12: ACTIVE + null + null → AVISO (datos incompletos) — resuelto en §8
    it('fila 12: ACTIVE null null → AVISO (datos incompletos)', () => {
      const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: null, health: null }));
      expect(r.primaryStatus).toBe('AVISO');
      expect(r.primaryReason).toContain('No hay datos suficientes');
    });

    // Fila 13: ACTIVE + ONLINE + null → OPERATIVA con nota de salud desconocida (Q1 default)
    it('fila 13: ACTIVE ONLINE null → OPERATIVA con nota de salud', () => {
      const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: CONN_ONLINE, health: null }));
      expect(r.primaryStatus).toBe('OPERATIVA');
      expect(r.primaryReason).toContain('salud aún no evaluada');
    });

    // Fila 14: ACTIVE + null + NORMAL → AVISO (no hay datos de conectividad) — §8
    it('fila 14: ACTIVE null NORMAL → AVISO (no hay datos de conectividad)', () => {
      const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: null, health: HEALTH_NORMAL }));
      expect(r.primaryStatus).toBe('AVISO');
      expect(r.primaryReason).toContain('conectividad');
    });

    // Fila 15: status ausente/undefined → DATOS_NO_DISPONIBLES (no `—` crudo)
    it('fila 15: sin status → DATOS_NO_DISPONIBLES', () => {
      const r = derivePrimaryStatus(null);
      expect(r.primaryStatus).toBe(DATOS_NO_DISPONIBLES);
      expect(r.primaryLabel).toBe('Datos no disponibles');
    });
  });

  describe('§7 Estados ambiguos e incompletos', () => {
    it('lastSeen null → PROVISIONANDO (lifecycle PROVISIONING)', () => {
      const r = derivePrimaryStatus(status({ lifecycle: PROVISIONING, connectivity: null, health: null }));
      expect(r.primaryStatus).toBe('PROVISIONANDO');
    });

    it('ONLINE sin telemetría válida NO es SIN CONEXIÓN → OPERATIVA', () => {
      // La cámara comunica (ONLINE), la salud puede no estar aún evaluada:
      const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: CONN_ONLINE, health: HEALTH_NORMAL }));
      expect(r.primaryStatus).toBe('OPERATIVA');
    });

    it('DEGRADED + anomalía de sensor → AVISO con causa enumerada', () => {
      const r = derivePrimaryStatus(
        status({ lifecycle: ACTIVE, connectivity: CONN_DEGRADED, health: HEALTH_WARNING }),
        { health: healthRecord({ sensorAht21: false }) }
      );
      expect(r.primaryStatus).toBe('AVISO');
      expect(r.primaryReason).toContain('señal intermitente');
      expect(r.primaryReason).toContain('sensor de temperatura');
    });

    it('MAINTENANCE + heartbeat reciente → nunca OPERATIVA', () => {
      const r = derivePrimaryStatus(status({ lifecycle: MAINTENANCE, connectivity: CONN_ONLINE, health: HEALTH_WARNING }));
      expect(r.primaryStatus).toBe('EN MANTENIMIENTO');
    });

    it('ACTIVE + null + null → AVISO (no OPERATIVA ni SIN CONEXIÓN)', () => {
      const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: null, health: null }));
      expect(r.primaryStatus).toBe('AVISO');
    });

    it('status undefined → DATOS_NO_DISPONIBLES (nunca —)', () => {
      const r = derivePrimaryStatus(undefined);
      expect(r.primaryStatus).toBe(DATOS_NO_DISPONIBLES);
    });
  });

  describe('§14 Casos límite', () => {
    it('Retired con conectividad/salud presentes → RETIRADA', () => {
      const r = derivePrimaryStatus(status({ lifecycle: RETIRED, connectivity: CONN_ONLINE, health: HEALTH_NORMAL }));
      expect(r.primaryStatus).toBe('RETIRADA');
    });

    it('MAINTENANCE + OFFLINE (señal obsoleta) → EN MANTENIMIENTO', () => {
      // En MAINTENANCE el backend no computa conectividad; el primario lo domina.
      const r = derivePrimaryStatus(status({ lifecycle: MAINTENANCE, connectivity: CONN_OFFLINE, health: HEALTH_NORMAL }));
      expect(r.primaryStatus).toBe('EN MANTENIMIENTO');
    });

    it('ACTIVE + null + NORMAL → AVISO "no hay datos de conectividad" (fila 14)', () => {
      const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: null, health: HEALTH_NORMAL }));
      expect(r.primaryStatus).toBe('AVISO');
      expect(r.primaryReason).toContain('conectividad');
    });
  });

  describe('primaryReason — causas concretas (AVISO)', () => {
    it('ERROR por i2cHealthy false → causa comunicacion sensores', () => {
      const r = derivePrimaryStatus(
        status({ lifecycle: ACTIVE, connectivity: CONN_ONLINE, health: HEALTH_ERROR }),
        { health: healthRecord({ i2cHealthy: false }) }
      );
      expect(r.primaryReason).toContain('sensores');
    });

    it('ERROR por heartbeatsHealthy false → no confirma funcionamiento', () => {
      const r = derivePrimaryStatus(
        status({ lifecycle: ACTIVE, connectivity: CONN_ONLINE, health: HEALTH_ERROR }),
        { health: healthRecord({ heartbeatsHealthy: false }) }
      );
      expect(r.primaryReason).toContain('funcionamiento');
    });

    it('ERROR por bootTestPassed false → fallo al encender', () => {
      const r = derivePrimaryStatus(
        status({ lifecycle: ACTIVE, connectivity: CONN_ONLINE, health: HEALTH_ERROR }),
        { health: healthRecord({ bootTestPassed: false }) }
      );
      expect(r.primaryReason).toContain('encender');
    });

    it('WARNING por sensorEns160 false → sensor de aire', () => {
      const r = derivePrimaryStatus(
        status({ lifecycle: ACTIVE, connectivity: CONN_ONLINE, health: HEALTH_WARNING }),
        { health: healthRecord({ sensorEns160: false }) }
      );
      expect(r.primaryReason).toContain('aire');
    });
  });

  describe('secondaryStates — desglose por ejes', () => {
    it('expone los 3 ejes con value y label (OEPRATIVA completa)', () => {
      const r = derivePrimaryStatus(status({ lifecycle: ACTIVE, connectivity: CONN_ONLINE, health: HEALTH_NORMAL }));
      expect(r.secondaryStates).toBeDefined();
      expect(r.secondaryStates.lifecycle).toEqual({ value: 'ACTIVE', label: 'En servicio' });
      expect(r.secondaryStates.connectivity).toEqual({ value: 'ONLINE', label: 'En línea' });
      expect(r.secondaryStates.health).toEqual({ value: 'NORMAL', label: 'Saludable' });
    });

    it('ejes ausentes quedan en null (MAINTENANCE no computa conectividad/salud)', () => {
      const r = derivePrimaryStatus(status({ lifecycle: MAINTENANCE, connectivity: null, health: null }));
      expect(r.secondaryStates.lifecycle).toEqual({ value: 'MAINTENANCE', label: 'En mantenimiento' });
      expect(r.secondaryStates.connectivity).toBeNull();
      expect(r.secondaryStates.health).toBeNull();
    });

    it('sin status → ejes todos null y label DATOS_NO_DISPONIBLES', () => {
      const r = derivePrimaryStatus(null);
      expect(r.secondaryStates).toEqual({
        lifecycle: null,
        connectivity: null,
        health: null,
      });
    });
  });

  describe('ethnic — no inventar estados', () => {
    it('solo devuelve uno de los 6 estados + DATOS_NO_DISPONIBLES', () => {
      const ALLOWED = new Set(['OPERATIVA', 'SIN CONEXIÓN', 'EN MANTENIMIENTO', 'AVISO', 'PROVISIONANDO', 'RETIRADA', DATOS_NO_DISPONIBLES]);
      const inputs = [
        status({ lifecycle: ACTIVE, connectivity: CONN_ONLINE, health: HEALTH_NORMAL }),
        status({ lifecycle: ACTIVE, connectivity: CONN_DEGRADED, health: HEALTH_WARNING }),
        status({ lifecycle: ACTIVE, connectivity: CONN_OFFLINE, health: HEALTH_NORMAL }),
        status({ lifecycle: MAINTENANCE, connectivity: null, health: null }),
        status({ lifecycle: RETIRED, connectivity: null, health: null }),
        status({ lifecycle: PROVISIONING, connectivity: null, health: null }),
        status({ lifecycle: ACTIVE, connectivity: null, health: null }),
        null,
      ];
      for (const input of inputs) {
        expect(ALLOWED.has(derivePrimaryStatus(input).primaryStatus)).toBe(true);
      }
    });
  });
});
