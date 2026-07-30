import { describe, it, expect } from 'vitest';
import {
  CONNECTIVITY, HEALTH_CONDITION, LIFECYCLE,
  CONNECTIVITY_CONFIG, HEALTH_CONFIG, LIFECYCLE_CONFIG,
  getPrimaryStatus, getStatusSummary, getStatusCssClass,
} from '../deviceStatus';

describe('deviceStatus constants', () => {
  it('CONNECTIVITY tiene ONLINE, DEGRADED, OFFLINE', () => {
    expect(CONNECTIVITY.ONLINE).toBe('ONLINE');
    expect(CONNECTIVITY.DEGRADED).toBe('DEGRADED');
    expect(CONNECTIVITY.OFFLINE).toBe('OFFLINE');
  });

  it('HEALTH_CONDITION tiene NORMAL, WARNING, ERROR', () => {
    expect(HEALTH_CONDITION.NORMAL).toBe('NORMAL');
    expect(HEALTH_CONDITION.WARNING).toBe('WARNING');
    expect(HEALTH_CONDITION.ERROR).toBe('ERROR');
  });

  it('LIFECYCLE tiene ACTIVE, MAINTENANCE, RETIRED', () => {
    expect(LIFECYCLE.ACTIVE).toBe('ACTIVE');
    expect(LIFECYCLE.MAINTENANCE).toBe('MAINTENANCE');
    expect(LIFECYCLE.RETIRED).toBe('RETIRED');
  });

  it('CONNECTIVITY_CONFIG tiene config para cada estado', () => {
    expect(CONNECTIVITY_CONFIG.ONLINE.label).toBe('En línea');
    expect(CONNECTIVITY_CONFIG.DEGRADED.label).toBe('Degradado');
    expect(CONNECTIVITY_CONFIG.OFFLINE.label).toBe('Fuera de línea');
  });

  it('HEALTH_CONFIG tiene config para cada estado', () => {
    expect(HEALTH_CONFIG.NORMAL.label).toBe('Saludable');
    expect(HEALTH_CONFIG.WARNING.label).toBe('Advertencia');
    expect(HEALTH_CONFIG.ERROR.label).toBe('Error');
  });

  it('LIFECYCLE_CONFIG tiene PROVISIONING, ACTIVE, MAINTENANCE, RETIRED', () => {
    expect(LIFECYCLE_CONFIG.PROVISIONING.label).toBe('Aprovisionando');
    expect(LIFECYCLE_CONFIG.ACTIVE.label).toBe('Activo');
    expect(LIFECYCLE_CONFIG.MAINTENANCE.label).toBe('Mantenimiento');
    expect(LIFECYCLE_CONFIG.RETIRED.label).toBe('Retirado');
  });
});

describe('getPrimaryStatus', () => {
  it('retorna UNKNOWN para null', () => {
    const result = getPrimaryStatus(null);
    expect(result.key).toBe('UNKNOWN');
  });

  it('prioriza PROVISIONING sobre conectividad', () => {
    const result = getPrimaryStatus({ lifecycle: 'PROVISIONING', connectivity: 'OFFLINE', health: 'ERROR' });
    expect(result.key).toBe('PROVISIONING');
  });

  it('prioriza RETIRED sobre todo', () => {
    const result = getPrimaryStatus({ lifecycle: 'RETIRED', connectivity: 'ONLINE', health: 'NORMAL' });
    expect(result.key).toBe('RETIRED');
  });

  it('prioriza MAINTENANCE sobre conectividad', () => {
    const result = getPrimaryStatus({ lifecycle: 'MAINTENANCE', connectivity: 'OFFLINE', health: 'ERROR' });
    expect(result.key).toBe('MAINTENANCE');
  });

  it('retorna OFFLINE cuando connectivity es OFFLINE', () => {
    const result = getPrimaryStatus({ lifecycle: 'ACTIVE', connectivity: 'OFFLINE', health: 'NORMAL' });
    expect(result.key).toBe('OFFLINE');
  });

  it('retorna ERROR cuando health es ERROR', () => {
    const result = getPrimaryStatus({ lifecycle: 'ACTIVE', connectivity: 'ONLINE', health: 'ERROR' });
    expect(result.key).toBe('ERROR');
  });

  it('retorna DEGRADED cuando connectivity es DEGRADED', () => {
    const result = getPrimaryStatus({ lifecycle: 'ACTIVE', connectivity: 'DEGRADED', health: 'NORMAL' });
    expect(result.key).toBe('DEGRADED');
  });

  it('retorna WARNING cuando health es WARNING', () => {
    const result = getPrimaryStatus({ lifecycle: 'ACTIVE', connectivity: 'ONLINE', health: 'WARNING' });
    expect(result.key).toBe('WARNING');
  });

  it('retorna ONLINE cuando todo normal', () => {
    const result = getPrimaryStatus({ lifecycle: 'ACTIVE', connectivity: 'ONLINE', health: 'NORMAL' });
    expect(result.key).toBe('ONLINE');
  });
});

describe('getStatusSummary', () => {
  it('retorna "Sin datos" para null', () => {
    expect(getStatusSummary(null)).toBe('Sin datos');
  });

  it('incluye health no-NORMAL cuando no es primario', () => {
    const result = getStatusSummary({ lifecycle: 'ACTIVE', connectivity: 'DEGRADED', health: 'WARNING' });
    expect(result).toContain('Degradado');
    expect(result).toContain('·');
    expect(result).toContain('Advertencia');
  });

  it('no duplica ERROR en el summary', () => {
    const result = getStatusSummary({ lifecycle: 'ACTIVE', connectivity: 'ONLINE', health: 'ERROR' });
    expect(result).toBe('Error');
  });
});

describe('getStatusCssClass', () => {
  it('retorna la cssClass del estado primario', () => {
    expect(getStatusCssClass({ lifecycle: 'ACTIVE', connectivity: 'ONLINE', health: 'NORMAL' })).toBe('online');
    expect(getStatusCssClass({ lifecycle: 'ACTIVE', connectivity: 'OFFLINE', health: 'NORMAL' })).toBe('offline');
  });
});
