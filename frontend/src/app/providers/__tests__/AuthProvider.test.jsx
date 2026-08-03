import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthProvider';

function Consumer() {
  const { user, login, logout, getToken, getRefreshToken } = useAuth();
  return (
    <div>
      <div data-testid="user">{user ? user.username : 'none'}</div>
      <div data-testid="token">{getToken() || 'none'}</div>
      <div data-testid="refresh">{getRefreshToken() || 'none'}</div>
      <button onClick={() => login({ id: 1, username: 'operador', role: 'OPERATOR' }, 'access-tok', 'refresh-tok')}>login</button>
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

describe('AuthProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('persiste la sesión en localStorage (compartido entre pestañas del mismo origen)', () => {
    setup();
    fireEvent.click(screen.getByText('login'));
    expect(screen.getByTestId('user').textContent).toBe('operador');
    expect(JSON.parse(window.localStorage.getItem('mush2_user')).username).toBe('operador');
    expect(window.localStorage.getItem('mush2_access_token')).toBe('access-tok');
    expect(window.localStorage.getItem('mush2_refresh_token')).toBe('refresh-tok');
  });

  it('hidrata la sesión en una pestaña nueva (sessionStorage vacío, localStorage intacto)', () => {
    window.localStorage.setItem('mush2_user', JSON.stringify({ id: 1, username: 'operador', role: 'OPERATOR' }));
    window.localStorage.setItem('mush2_access_token', 'access-tok');
    window.localStorage.setItem('mush2_refresh_token', 'refresh-tok');
    window.sessionStorage.clear();
    setup();
    expect(screen.getByTestId('user').textContent).toBe('operador');
    expect(screen.getByTestId('token').textContent).toBe('access-tok');
    expect(screen.getByTestId('refresh').textContent).toBe('refresh-tok');
  });

  it('no hidrata si localStorage está vacío', () => {
    setup();
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(screen.getByTestId('token').textContent).toBe('none');
  });

  it('logout limpia los tres valores de localStorage', () => {
    setup();
    fireEvent.click(screen.getByText('login'));
    fireEvent.click(screen.getByText('logout'));
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(window.localStorage.getItem('mush2_user')).toBeNull();
    expect(window.localStorage.getItem('mush2_access_token')).toBeNull();
    expect(window.localStorage.getItem('mush2_refresh_token')).toBeNull();
  });
});
