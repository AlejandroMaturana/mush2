import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingState from '../LoadingState';

describe('LoadingState', () => {
  it('renderiza mensaje por defecto', () => {
    render(<LoadingState />);
    expect(screen.getByText('Cargando datos...')).toBeTruthy();
  });

  it('renderiza mensaje personalizado', () => {
    render(<LoadingState message="Cargando dispositivos..." />);
    expect(screen.getByText('Cargando dispositivos...')).toBeTruthy();
  });

  it('renderiza icono sync por defecto', () => {
    const { container } = render(<LoadingState />);
    expect(container.querySelector('.material-symbols-outlined')?.textContent).toBe('sync');
  });
});
