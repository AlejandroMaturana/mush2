import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireRole from '../RequireRole';

let mockRole = 'VIEWER';
vi.mock('../../../app/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { role: mockRole } }),
}));

function renderRoute(allowed) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={<RequireRole allowed={allowed}><div data-testid="content">ADMIN CONTENT</div></RequireRole>}
        />
        <Route path="/forbidden" element={<div data-testid="forbidden">FORBIDDEN</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireRole (ISSUE-030: RBAC en UI)', () => {
  beforeEach(() => { mockRole = 'VIEWER'; });

  it('VIEWER NO ve el contenido ADMIN (muestra 403)', () => {
    renderRoute(['ADMIN', 'SUPER_ADMIN']);
    expect(screen.queryByTestId('content')).toBeNull();
    expect(screen.getByTestId('forbidden')).toBeTruthy();
  });

  it('VIEWER NO ve el contenido SUPER_ADMIN (muestra 403)', () => {
    renderRoute(['SUPER_ADMIN']);
    expect(screen.queryByTestId('content')).toBeNull();
    expect(screen.getByTestId('forbidden')).toBeTruthy();
  });

  it('ADMIN SÍ ve el contenido ADMIN', () => {
    mockRole = 'ADMIN';
    renderRoute(['ADMIN', 'SUPER_ADMIN']);
    expect(screen.getByTestId('content')).toBeTruthy();
    expect(screen.queryByTestId('forbidden')).toBeNull();
  });

  it('SUPER_ADMIN SÍ ve el contenido SUPER_ADMIN', () => {
    mockRole = 'SUPER_ADMIN';
    renderRoute(['SUPER_ADMIN']);
    expect(screen.getByTestId('content')).toBeTruthy();
  });
});
