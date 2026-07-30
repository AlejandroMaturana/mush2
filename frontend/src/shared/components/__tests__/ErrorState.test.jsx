import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorState from '../ErrorState';

describe('ErrorState', () => {
  it('renderiza mensaje por defecto', () => {
    render(<ErrorState />);
    expect(screen.getByText('Conexión interrumpida')).toBeTruthy();
  });

  it('renderiza mensaje personalizado', () => {
    render(<ErrorState message="Error al cargar" />);
    expect(screen.getByText('Error al cargar')).toBeTruthy();
  });

  it('no renderiza botón si onRetry no está presente', () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByText('Reintentar conexión')).toBeNull();
  });

  it('renderiza botón de reintento y llama a onRetry al hacer click', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    const btn = screen.getByText('Reintentar conexión');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
