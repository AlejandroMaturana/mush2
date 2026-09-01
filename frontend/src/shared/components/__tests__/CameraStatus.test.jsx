import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CameraStatus from '../CameraStatus';

// Props del contrato M0.2 §9.2 / §10 (estado derivado por backend).
function derivedProps(overrides = {}) {
  return {
    primaryStatus: 'OPERATIVA',
    primaryLabel: 'Operativa',
    primaryReason: null,
    secondaryStates: {
      lifecycle: { value: 'ACTIVE', label: 'En servicio' },
      connectivity: { value: 'ONLINE', label: 'En línea' },
      health: { value: 'NORMAL', label: 'Saludable' },
    },
    lastTransmission: { secondsSinceLastSeen: 5, heartbeatInterval: 10 },
    ...overrides,
  };
}

describe('CameraStatus', () => {
  it('no deriva precedence: muestra el primaryStatus que recibe, no los ejes', () => {
    // Aunque los ejes digan ONLINE/NORMAL, si el backend envía AVISO se muestra AVISO.
    render(<CameraStatus {...derivedProps({ primaryStatus: 'AVISO', primaryLabel: 'Aviso' })} />);
    expect(screen.getByText('Aviso')).toBeTruthy();
    expect(screen.queryByText('Operativa')).toBeNull();
  });

  it('renderiza los 6 estados principales por primaryLabel', () => {
    const states = [
      { primaryStatus: 'OPERATIVA', primaryLabel: 'Operativa' },
      { primaryStatus: 'SIN CONEXIÓN', primaryLabel: 'Sin conexión' },
      { primaryStatus: 'EN MANTENIMIENTO', primaryLabel: 'En mantenimiento' },
      { primaryStatus: 'AVISO', primaryLabel: 'Aviso' },
      { primaryStatus: 'PROVISIONANDO', primaryLabel: 'Aprovisionando' },
      { primaryStatus: 'RETIRADA', primaryLabel: 'Retirada' },
    ];
    for (const st of states) {
      const { unmount } = render(<CameraStatus {...derivedProps(st)} />);
      expect(screen.getByText(st.primaryLabel)).toBeTruthy();
      unmount();
    }
  });

  it('DATOS_NO_DISPONIBLES muestra lectura legible, nunca "—" crudo', () => {
    render(<CameraStatus {...derivedProps({ primaryStatus: 'DATOS_NO_DISPONIBLES', primaryLabel: 'Datos no disponibles' })} />);
    expect(screen.getByText('Datos no disponibles')).toBeTruthy();
    expect(screen.queryByText('—')).toBeNull();
  });

  it('muestra primaryReason para AVISO', () => {
    render(<CameraStatus {...derivedProps({ primaryStatus: 'AVISO', primaryLabel: 'Aviso', primaryReason: 'señal intermitente' })} />);
    expect(screen.getByText(/señal intermitente/)).toBeTruthy();
  });

  it('muestra el desglose por ejes (secondaryStates)', () => {
    render(<CameraStatus {...derivedProps()} />);
    expect(screen.getByText('En servicio')).toBeTruthy();
    expect(screen.getByText('En línea')).toBeTruthy();
    expect(screen.getByText('Saludable')).toBeTruthy();
  });

  it('muestra la última transmisión legible', () => {
    render(<CameraStatus {...derivedProps({ lastTransmission: { secondsSinceLastSeen: 4, heartbeatInterval: 10 } })} />);
    expect(screen.getByText('Hace un momento')).toBeTruthy();
    expect(screen.getByText('Última transmisión:')).toBeTruthy();
  });

  it('sin lastTransmission muestra "Sin datos"', () => {
    render(<CameraStatus {...derivedProps({ lastTransmission: null })} />);
    expect(screen.getByText('Sin datos')).toBeTruthy();
  });

  it('usa un dot con clase semántica según primaryStatus (presentación, no precedencia)', () => {
    const { container } = render(<CameraStatus {...derivedProps({ primaryStatus: 'SIN CONEXIÓN', primaryLabel: 'Sin conexión' })} />);
    expect(container.querySelector('.camera-status-dot')).toBeTruthy();
  });

  it('technicalDetails: vista experta bajo Progressive Disclosure (oculta por defecto, se revela)', () => {
    const technicalDetails = { bootTest: 'PASS', heapFree: 187392, aht21: 'OK' };
    const { container } = render(<CameraStatus {...derivedProps({ technicalDetails })} />);

    // Oculta por defecto: el desplegable está cerrado (no expandido), el detalle queda colapsado.
    const summary = container.querySelector('details.camera-status-expert > summary');
    expect(summary).toBeTruthy();
    expect(container.querySelector('details.camera-status-expert').open).toBe(false);

    // Al abrir el <details> se revela el diagnóstico sin eliminar información.
    summary.click();
    expect(container.querySelector('details.camera-status-expert').open).toBe(true);
    expect(screen.getByText('PASS')).toBeTruthy();
    expect(screen.getByText('187392')).toBeTruthy();
  });

  it('sin technicalDetails no muestra la vista experta', () => {
    const { container } = render(<CameraStatus {...derivedProps()} />);
    expect(container.querySelector('details.camera-status-expert')).toBeNull();
  });
});
