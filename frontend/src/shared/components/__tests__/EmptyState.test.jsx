import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('renderiza con valores por defecto', () => {
    const { container } = render(<EmptyState />);
    expect(container.querySelector('.empty-state')).toBeTruthy();
  });

  it('renderiza título y mensaje', () => {
    render(<EmptyState title="Sin datos" message="No hay dispositivos registrados" />);
    expect(screen.getByText('Sin datos')).toBeTruthy();
    expect(screen.getByText('No hay dispositivos registrados')).toBeTruthy();
  });

  it('renderiza icono personalizado', () => {
    const { container } = render(<EmptyState icon="devices" />);
    expect(container.querySelector('.material-symbols-outlined')?.textContent).toBe('devices');
  });

  it('renderiza acción y maneja click', () => {
    const onClick = vi.fn();
    render(<EmptyState action={{ label: 'Agregar dispositivo', onClick }} />);
    const btn = screen.getByText('Agregar dispositivo');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
