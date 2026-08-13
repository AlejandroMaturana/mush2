import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSE } from '../useSSE';

class MockEventSource {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.closed = false;
    this.onerror = null;
    MockEventSource.instances.push(this);
  }

  addEventListener(type, cb) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(cb);
  }

  dispatch(type, data) {
    const list = this.listeners.get(type) || [];
    list.forEach((cb) => cb({ type, data: typeof data === 'string' ? data : JSON.stringify(data) }));
  }

  close() {
    this.closed = true;
  }
}

const SSE_TYPES = [
  'connected',
  'ack',
  'state',
  'telemetry',
  'alarm',
  'control_eval',
  'health',
  'maintenance',
  'phase_transition',
  'device_health',
  'device_status_changed',
];

describe('useSSE (ISSUE-040/ISSUE-108: flujo auth/SSE seguro + mock determinista de EventSource)', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    globalThis.EventSource = MockEventSource;
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('se conecta a /events relativo sin token en la URL ni en localStorage', () => {
    renderHook(() => useSSE(vi.fn()));
    const es = MockEventSource.instances[0];
    expect(es.url).toBe('/events');
    expect(es.url).not.toMatch(/token|access|refresh|auth/i);
    expect(window.localStorage.getItem('mush2_access_token')).toBeNull();
    expect(window.localStorage.getItem('mush2_refresh_token')).toBeNull();
  });

  it('registra un listener para cada tipo de evento del contrato SSE', () => {
    renderHook(() => useSSE(vi.fn()));
    const es = MockEventSource.instances[0];
    for (const type of SSE_TYPES) {
      expect(es.listeners.get(type), `listener para ${type}`).toBeDefined();
    }
  });

  it('despacha evento JSON y llama al callback con (type, payload parseado)', () => {
    const cb = vi.fn();
    renderHook(() => useSSE(cb));
    const es = MockEventSource.instances[0];
    es.dispatch('alarm', { level: 'CRITICAL', ts: 123 });
    expect(cb).toHaveBeenCalledWith('alarm', { level: 'CRITICAL', ts: 123 });
  });

  it('data malformada no rompe el callback ni la conexión', () => {
    const cb = vi.fn();
    renderHook(() => useSSE(cb));
    const es = MockEventSource.instances[0];
    expect(() => es.dispatch('telemetry', 'no-json{')).not.toThrow();
    expect(es.closed).toBe(false);
  });

  it('define onerror y NO cierra la conexión (preserva reconexión nativa de EventSource)', () => {
    renderHook(() => useSSE(vi.fn()));
    const es = MockEventSource.instances[0];
    expect(typeof es.onerror).toBe('function');
    es.onerror();
    expect(es.closed).toBe(false);
  });

  it('la función close() devuelta cierra la conexión activa', async () => {
    const { result } = renderHook(() => useSSE(vi.fn()));
    const es = MockEventSource.instances[0];
    await act(async () => {
      result.current();
    });
    expect(es.closed).toBe(true);
  });

  it('al desmontar cierra la conexión', () => {
    const { unmount } = renderHook(() => useSSE(vi.fn()));
    const es = MockEventSource.instances[0];
    unmount();
    expect(es.closed).toBe(true);
  });

  it('tras un re-render usa el ÚLTIMO callback sin recrear la conexión', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useSSE(cb), { initialProps: { cb: first } });
    expect(MockEventSource.instances).toHaveLength(1);
    rerender({ cb: second });
    expect(MockEventSource.instances).toHaveLength(1);
    MockEventSource.instances[0].dispatch('ack', { ok: true });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('ack', { ok: true });
  });

  it('no crea una segunda conexión si la anterior sigue activa', () => {
    renderHook(() => useSSE(vi.fn()));
    renderHook(() => useSSE(vi.fn()));
    expect(MockEventSource.instances).toHaveLength(2);
  });
});