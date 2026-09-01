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
    list.forEach((cb) => cb({ type, data: typeof data === 'string' ? data : JSON.stringify(data), lastEventId: '1' }));
  }

  close() {
    this.closed = true;
  }
}

const SSE_TYPES = [
  'connected', 'ack', 'state', 'telemetry', 'alarm', 'control_eval',
  'health', 'maintenance', 'phase_transition', 'device_health', 'device_status_changed',
];

describe('useSSE (I032: singleton + reconexión + I033: refresh + I101: URL canónica)', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    globalThis.EventSource = MockEventSource;
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    return () => vi.useRealTimers();
  });

  it('singleton: múltiples hooks comparten UNA sola conexión EventSource', () => {
    renderHook(() => useSSE(vi.fn()));
    renderHook(() => useSSE(vi.fn()));
    renderHook(() => useSSE(vi.fn()));
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it('se conecta a /events relativo (I101: URL canónica)', () => {
    renderHook(() => useSSE(vi.fn()));
    const es = MockEventSource.instances[0];
    expect(es.url).toMatch(/^\/events/);
    expect(es.url).not.toMatch(/api\/v1/);
  });

  it('registra listener para cada tipo de evento del contrato SSE', () => {
    renderHook(() => useSSE(vi.fn()));
    const es = MockEventSource.instances[0];
    for (const type of SSE_TYPES) {
      expect(es.listeners.get(type), `listener para ${type}`).toBeDefined();
    }
  });

  it('despacha evento JSON al callback con (type, payload)', () => {
    const cb = vi.fn();
    renderHook(() => useSSE(cb));
    const es = MockEventSource.instances[0];
    es.dispatch('alarm', { level: 'CRITICAL', ts: 123 });
    expect(cb).toHaveBeenCalledWith('alarm', { level: 'CRITICAL', ts: 123 });
  });

  it('data malformada no rompe callback ni conexión', () => {
    const cb = vi.fn();
    renderHook(() => useSSE(cb));
    const es = MockEventSource.instances[0];
    expect(() => es.dispatch('telemetry', 'no-json{')).not.toThrow();
    expect(es.closed).toBe(false);
  });

  it('error cierra conexión y programa reconexión con backoff', () => {
    renderHook(() => useSSE(vi.fn()));
    const es = MockEventSource.instances[0];
    expect(MockEventSource.instances).toHaveLength(1);

    act(() => {
      es.onerror();
    });

    expect(es.closed).toBe(true);
    expect(MockEventSource.instances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(MockEventSource.instances).toHaveLength(2);
  });

  it('tras error, backoff exponencial crece (1s → 2s → 4s → ... → 30s)', () => {
    renderHook(() => useSSE(vi.fn()));
    const es1 = MockEventSource.instances[0];

    act(() => { es1.onerror(); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(MockEventSource.instances).toHaveLength(2);

    const es2 = MockEventSource.instances[1];
    act(() => { es2.onerror(); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(MockEventSource.instances).toHaveLength(3);

    const es3 = MockEventSource.instances[2];
    act(() => { es3.onerror(); });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(MockEventSource.instances).toHaveLength(4);
  });

  it('la función close() cierra la conexión activa', () => {
    const { result } = renderHook(() => useSSE(vi.fn()));
    const es = MockEventSource.instances[0];
    act(() => {
      result.current();
    });
    expect(es.closed).toBe(true);
  });

  it('al desmontar el último subscriber cierra la conexión', () => {
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

  it('no almacena tokens en localStorage (seguridad)', () => {
    renderHook(() => useSSE(vi.fn()));
    expect(window.localStorage.getItem('mush2_access_token')).toBeNull();
    expect(window.localStorage.getItem('mush2_refresh_token')).toBeNull();
  });
});
