import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../DashboardPage';

function renderDashboard() {
  return render(<MemoryRouter><Dashboard /></MemoryRouter>);
}

vi.mock('../../../../api/useSSE', () => ({
  useSSE: () => {},
}));

vi.mock('../../../../api/client', () => ({
  getDashboardSummary: vi.fn(),
}));

import { getDashboardSummary } from '../../../../api/client';

describe('DashboardPage (D1/T8-T9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consume primaryStatus/primaryLabel del backend (no reimplementa precedencia)', async () => {
    // Backend envía AVISO aunque status.connectivity sea OFFLINE: prevalece el primario de backend.
    getDashboardSummary.mockResolvedValue([
      {
        id: 1,
        deviceId: 'cam-1',
        chamberName: 'Cámara Norte',
        status: { connectivity: 'OFFLINE', health: 'NORMAL', lifecycle: 'ACTIVE' },
        primaryStatus: 'AVISO',
        primaryLabel: 'Aviso',
        primaryReason: 'señal intermitente',
        secondaryStates: {},
        lastTransmission: { secondsSinceLastSeen: 5 },
        latestTelemetry: { temperature: 23.5, humidity: 71, co2: 900, voc: 200 },
      },
    ]);

    renderDashboard();

    await waitFor(() => expect(screen.getByText('Cámara Norte')).toBeTruthy());
    // Muestra Aviso (primario de backend), NO "Sin conexión" derivado localmente.
    expect(screen.getByText('Aviso')).toBeTruthy();
    expect(screen.queryByText('Sin conexión')).toBeNull();
  });

  it('renderiza estado vacío sin dispositivos', async () => {
    getDashboardSummary.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Sin dispositivos registrados')).toBeTruthy());
  });

  it('muestra los 6 estados principales por primaryLabel del backend', async () => {
    const cases = [
      { id: 1, primaryStatus: 'OPERATIVA', primaryLabel: 'Operativa' },
      { id: 2, primaryStatus: 'SIN CONEXIÓN', primaryLabel: 'Sin conexión' },
      { id: 3, primaryStatus: 'EN MANTENIMIENTO', primaryLabel: 'En mantenimiento' },
      { id: 4, primaryStatus: 'AVISO', primaryLabel: 'Aviso' },
      { id: 5, primaryStatus: 'PROVISIONANDO', primaryLabel: 'Aprovisionando' },
      { id: 6, primaryStatus: 'RETIRADA', primaryLabel: 'Retirada' },
    ];
    getDashboardSummary.mockResolvedValue(
      cases.map(c => ({
        id: c.id,
        deviceId: `cam-${c.id}`,
        chamberName: `Cámara ${c.id}`,
        status: { connectivity: null, health: null, lifecycle: 'ACTIVE' },
        ...c,
        secondaryStates: {},
        latestTelemetry: {},
      }))
    );

    renderDashboard();

    for (const c of cases) {
      await waitFor(() => expect(screen.getByText(c.primaryLabel)).toBeTruthy());
    }
  });

  it('T9: hace UNA sola llamada agregada (sin N+1 a getLatestTelemetry)', async () => {
    getDashboardSummary.mockResolvedValue([
      { id: 1, deviceId: 'cam-1', chamberName: 'Cámara', status: {}, primaryStatus: 'OPERATIVA', primaryLabel: 'Operativa', secondaryStates: {}, latestTelemetry: { temperature: 24 } },
      { id: 2, deviceId: 'cam-2', chamberName: 'Cámara 2', status: {}, primaryStatus: 'OPERATIVA', primaryLabel: 'Operativa', secondaryStates: {}, latestTelemetry: { temperature: 22 } },
    ]);

    renderDashboard();
    await waitFor(() => expect(screen.getByText('Cámara')).toBeTruthy());

    expect(getDashboardSummary).toHaveBeenCalledTimes(1);
  });

  it('DATOS_NO_DISPONIBLES: sin primaryStatus muestra lectura legible, nunca "—" crudo', async () => {
    getDashboardSummary.mockResolvedValue([
      {
        id: 7, deviceId: 'cam-7', chamberName: 'Cámara 7',
        status: null, primaryStatus: 'DATOS_NO_DISPONIBLES', primaryLabel: 'Datos no disponibles',
        secondaryStates: {}, latestTelemetry: {},
      },
    ]);

    renderDashboard();

    await waitFor(() => expect(screen.getByText('Datos no disponibles')).toBeTruthy());
    expect(screen.queryByText('—')).toBeNull();
  });

  it('resúmenes se agregan por primaryStatus (RETIRADA cuenta como fuera de línea)', async () => {
    getDashboardSummary.mockResolvedValue([
      { id: 1, deviceId: 'cam-1', chamberName: 'A', status: {}, primaryStatus: 'OPERATIVA', primaryLabel: 'Operativa', secondaryStates: {}, latestTelemetry: {} },
      { id: 2, deviceId: 'cam-2', chamberName: 'B', status: {}, primaryStatus: 'AVISO', primaryLabel: 'Aviso', secondaryStates: {}, latestTelemetry: {} },
      { id: 3, deviceId: 'cam-3', chamberName: 'C', status: { connectivity: null, health: null, lifecycle: 'RETIRED' }, primaryStatus: 'RETIRADA', primaryLabel: 'Retirada', secondaryStates: {}, latestTelemetry: {} },
    ]);

    renderDashboard();
    await waitFor(() => expect(screen.getByText('A')).toBeTruthy());

    // 2 en línea (OPERATIVA + AVISO), 1 fuera de línea (RETIRADA).
    const onlineValue = screen.getByText('En línea').closest('.summary-card-info').querySelector('.summary-card-value')
    const offlineValue = screen.getByText('Fuera de línea').closest('.summary-card-info').querySelector('.summary-card-value')
    expect(onlineValue.textContent).toBe('2')
    expect(offlineValue.textContent).toBe('1')
  });
});
