import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DeviceConnectivityPanel from '../DeviceConnectivityPanel';

vi.mock('../../../../api/useSSE', () => ({
  useSSE: () => {},
}));

vi.mock('../../../../api/client', () => ({
  getDeviceConnectivity: vi.fn(),
  setMaintenanceMode: vi.fn(),
}));

import { getDeviceConnectivity, setMaintenanceMode } from '../../../../api/client';

describe('DeviceConnectivityPanel (D2/T7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el primaryStatus derivado por backend, sin recomputar precedencia en frontend', async () => {
    getDeviceConnectivity.mockResolvedValue({
      primaryStatus: 'AVISO',
      primaryLabel: 'Aviso',
      primaryReason: 'señal intermitente',
      secondaryStates: {
        lifecycle: { value: 'ACTIVE', label: 'En servicio' },
        connectivity: { value: 'ONLINE', label: 'En línea' },
        health: { value: 'DEGRADED', label: 'Salud degradada' },
      },
      lastTransmission: { secondsSinceLastSeen: 5, heartbeatInterval: 10 },
      heartbeatInterval: 10,
      degradedThreshold: 30,
      offlineThreshold: 60,
      maintenanceMode: false,
      secondsSinceLastSeen: 5,
      diagnostics: { i2c: 'OK', sensorAht21: 'OK', sensorEns160: 'OK', heartbeatsHealthy: false },
    });
    setMaintenanceMode.mockResolvedValue({ maintenanceMode: false });

    render(<DeviceConnectivityPanel deviceId="cam-1" />);

    await waitFor(() => expect(screen.getByText('Aviso')).toBeTruthy());
    expect(screen.getByText(/señal intermitente/)).toBeTruthy();
    expect(screen.getByText('En línea')).toBeTruthy();
  });

  it('no muestra una etiqueta derivada localmente (Operativa) cuando el backend dice SIN CONEXIÓN', async () => {
    getDeviceConnectivity.mockResolvedValue({
      primaryStatus: 'SIN CONEXIÓN',
      primaryLabel: 'Sin conexión',
      primaryReason: null,
      secondaryStates: { lifecycle: { value: 'ACTIVE', label: 'En servicio' } },
      lastTransmission: { secondsSinceLastSeen: 600, heartbeatInterval: 10 },
      heartbeatInterval: 10,
      degradedThreshold: 30,
      offlineThreshold: 60,
      maintenanceMode: false,
      secondsSinceLastSeen: 600,
    });
    setMaintenanceMode.mockResolvedValue({ maintenanceMode: false });

    render(<DeviceConnectivityPanel deviceId="cam-1" />);

    await waitFor(() => expect(screen.getByText('Sin conexión')).toBeTruthy());
    expect(screen.queryByText('Operativa')).toBeNull();
  });

  it('alterna mantenimiento llamando setMaintenanceMode(deviceId, true)', async () => {
    getDeviceConnectivity.mockResolvedValue({
      primaryStatus: 'EN MANTENIMIENTO',
      primaryLabel: 'En mantenimiento',
      primaryReason: null,
      secondaryStates: { lifecycle: { value: 'MAINTENANCE', label: 'En mantenimiento' } },
      lastTransmission: { secondsSinceLastSeen: 5, heartbeatInterval: 10 },
      heartbeatInterval: 10,
      degradedThreshold: 30,
      offlineThreshold: 60,
      maintenanceMode: true,
      secondsSinceLastSeen: 5,
    });
    setMaintenanceMode.mockResolvedValue({ maintenanceMode: false });

    render(<DeviceConnectivityPanel deviceId="cam-1" />);

    await waitFor(() =>
      expect(screen.getAllByText('En mantenimiento').length).toBeGreaterThan(0)
    );
    expect(screen.getByText('SALIR DE MANTENIMIENTO')).toBeTruthy();

    fireEvent.click(screen.getByText('SALIR DE MANTENIMIENTO'));
    expect(setMaintenanceMode).toHaveBeenCalledWith('cam-1', false);
  });

  it('revela el diagnóstico técnico solo al expandir la vista experta (Progressive Disclosure)', async () => {
    getDeviceConnectivity.mockResolvedValue({
      primaryStatus: 'AVISO',
      primaryLabel: 'Aviso',
      primaryReason: null,
      secondaryStates: { connectivity: { value: 'ONLINE', label: 'En línea' } },
      lastTransmission: { secondsSinceLastSeen: 5, heartbeatInterval: 10 },
      heartbeatInterval: 10,
      degradedThreshold: 30,
      offlineThreshold: 60,
      maintenanceMode: false,
      secondsSinceLastSeen: 5,
      diagnostics: { i2c: 'OK', sensorAht21: 'OK', sensorEns160: 'OK', heartbeatsHealthy: false },
    });
    setMaintenanceMode.mockResolvedValue({ maintenanceMode: false });

    render(<DeviceConnectivityPanel deviceId="cam-1" />);

    await waitFor(() => expect(screen.getByText('Aviso')).toBeTruthy());
    // Diagnóstico técnico oculto por defecto.
    expect(screen.queryByText('I2C: OK')).toBeNull();

    fireEvent.click(screen.getByText(/Vista experta/));
    expect(screen.getByText('I2C: OK')).toBeTruthy();
    expect(screen.getByText('Heartbeats: FAIL')).toBeTruthy();
  });
});
