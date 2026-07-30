import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('une clases con espacio', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filtra valores falsy', () => {
    expect(cn('a', false, null, undefined, 0, 'b')).toBe('a b');
  });

  it('retorna string vacio sin argumentos', () => {
    expect(cn()).toBe('');
  });

  it('retorna string vacio si todo es falsy', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});
