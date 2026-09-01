import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Alarms from '../AlarmsPage';
vi.mock('../../../../api/useSSE', () => ({
  useSSE: (cb) => cb,
}));

vi.mock('../../../../api/client', () => ({
  getAlarms: vi.fn(),
  acknowledgeAlarm: vi.fn(),
  resolveAlarm: vi.fn(),
}));

import { getAlarms, acknowledgeAlarm, resolveAlarm } from '../../../../api/client';

function makeAlarm(overrides = {}) {
  return {
    id: 1,
    type: 'THRESHOLD_CROSSED',
    severity: 'HIGH',
    message: 'Temperatura fuera de rango',
    sensorType: 'TEMPERATURE',
    currentValue: 35,
    thresholdMin: 18,
    thresholdMax: 28,
    isAcknowledged: false,
    resolvedAt: null,
    createdAt: new Date('2026-01-01T10:00:00').toISOString(),
    Device: { chamberName: 'Cámara Norte' },
    ...overrides,
  };
}

describe('D3/T10 — AlarmsPage (5 niveles de alerta)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAlarms.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, pages: 1 } });
  });

  it('muestra los 5 niveles de la alarma (Qué ocurrió/…/Cómo verificar)', async () => {
    getAlarms.mockResolvedValue({ data: [makeAlarm()], pagination: { total: 1, page: 1, pages: 1 } });
    const { container } = render(<Alarms />);

    // "Qué ocurrió" (what) es visible incluso con Progressive Disclosure cerrado.
    await waitFor(() => expect(screen.getAllByText(/se superó el umbral de temperatura/i).length).toBeGreaterThan(0));

    // Abrir el <details> (Progressive Disclosure, H-4) para exponer los 5 niveles.
    fireEvent.click(container.querySelector('summary'));

    for (const label of ['Qué ocurrió', 'Qué significa', 'Qué impacto', 'Qué debería hacer', 'Cómo verificar']) {
      expect(screen.getAllByText(`${label}:`).length).toBeGreaterThan(0);
    }
  });

  it('no muestra el type técnico/raw al usuario', async () => {
    getAlarms.mockResolvedValue({ data: [makeAlarm()], pagination: { total: 1, page: 1, pages: 1 } });
    render(<Alarms />);

    await waitFor(() => expect(screen.getAllByText(/se superó el umbral/i).length).toBeGreaterThan(0));
    expect(screen.queryByText('THRESHOLD_CROSSED')).toBeNull();
    expect(screen.queryByText('SENSOR_FAULT')).toBeNull();
  });

  it('acknowledgeAlarm sigue funcionando (ACK)', async () => {
    getAlarms.mockResolvedValue({ data: [makeAlarm()], pagination: { total: 1, page: 1, pages: 1 } });
    acknowledgeAlarm.mockResolvedValue({});
    render(<Alarms />);

    await waitFor(() => expect(screen.getByText('ACK')).toBeTruthy());
    fireEvent.click(screen.getByText('ACK'));
    await waitFor(() => expect(acknowledgeAlarm).toHaveBeenCalledWith(1));
  });

  it('resolveAlarm sigue funcionando (RESOLVE)', async () => {
    getAlarms.mockResolvedValue({ data: [makeAlarm()], pagination: { total: 1, page: 1, pages: 1 } });
    resolveAlarm.mockResolvedValue({});
    render(<Alarms />);

    await waitFor(() => expect(screen.getByText('RESOLVE')).toBeTruthy());
    fireEvent.click(screen.getByText('RESOLVE'));
    await waitFor(() => expect(resolveAlarm).toHaveBeenCalledWith(1));
  });

  it('renderiza estado vacío sin alarmas', async () => {
    render(<Alarms />);
    await waitFor(() => expect(screen.getByText(/Sin alarmas/i)).toBeTruthy());
  });

  it('D3/T11 — usa el campo derivado por backend (N2) cuando viene en la respuesta', async () => {
    // El backend (single source of truth) envía 'what' explícito; debe primar
    // sobre la derivación local N1 (que diría "Se superó el umbral ...").
    getAlarms.mockResolvedValue({
      data: [makeAlarm({ what: 'La temperatura de la cámara excedió el límite permitido' })],
      pagination: { total: 1, page: 1, pages: 1 },
    });
    render(<Alarms />);

    await waitFor(() => expect(screen.getAllByText(/excedió el límite permitido/i).length).toBeGreaterThan(0));
    expect(screen.queryByText(/se superó el umbral/i)).toBeNull();
  });
});
