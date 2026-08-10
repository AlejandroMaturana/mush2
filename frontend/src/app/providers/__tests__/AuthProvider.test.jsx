import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthProvider';
import { getAccessToken, setAccessToken, clearAccessToken } from '../../../shared/api/tokenStore';

vi.mock('../../../features/auth/api/auth', () => ({
  logout: vi.fn(async () => ({ message: 'Sesión cerrada' })),
}));

function Consumer() {
  const { user, login, logout, getToken } = useAuth();
  return (
    <div>
      <div data-testid="user">{user ? user.username : 'none'}</div>
      <div data-testid="token">{getToken() || 'none'}</div>
      <div data-testid="hasRefresh">{typeof getToken === 'function' ? 'getToken-only' : 'unknown'}</div>
      <button onClick={() => login({ id: 1, username: 'operador', role: 'OPERATOR' }, 'access-tok')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function setup() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>
  );
}

describe('AuthProvider (ISSUE-029: acceso en memoria + refresh por cookie httpOnly)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearAccessToken();
    vi.clearAllMocks();
  });

  it('login persiste SOLO el perfil de usuario en localStorage; NUNCA el JWT', () => {
    setup();
    fireEvent.click(screen.getByText('login'));
    expect(screen.getByTestId('user').textContent).toBe('operador');
    expect(JSON.parse(window.localStorage.getItem('mush2_user')).username).toBe('operador');
    expect(window.localStorage.getItem('mush2_access_token')).toBeNull();
    expect(window.localStorage.getItem('mush2_refresh_token')).toBeNull();
  });

  it('el access token vive en memoria y getToken lo devuelve (sin localStorage)', () => {
    setup();
    fireEvent.click(screen.getByText('login'));
    expect(screen.getByTestId('token').textContent).toBe('access-tok');
    expect(getAccessToken()).toBe('access-tok');
    expect(window.localStorage.getItem('mush2_access_token')).toBeNull();
  });

  it('logout llama al backend y limpia memoria + localStorage', async () => {
    const authApi = await import('../../../features/auth/api/auth');
    setup();
    fireEvent.click(screen.getByText('login'));
    setAccessToken('access-tok');
    fireEvent.click(screen.getByText('logout'));

    expect(authApi.logout).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('none');
      expect(getAccessToken()).toBeNull();
      expect(window.localStorage.getItem('mush2_user')).toBeNull();
    });
  });

  it('hidrata el perfil de usuario desde localStorage; el token queda en memoria (null tras reload)', () => {
    window.localStorage.setItem('mush2_user', JSON.stringify({ id: 1, username: 'operador', role: 'OPERATOR' }));
    setup();
    expect(screen.getByTestId('user').textContent).toBe('operador');
    expect(screen.getByTestId('token').textContent).toBe('none');
    expect(window.localStorage.getItem('mush2_access_token')).toBeNull();
  });

  it('no hidrata si localStorage está vacío', () => {
    setup();
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(screen.getByTestId('token').textContent).toBe('none');
  });
});
