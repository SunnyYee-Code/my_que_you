import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import RequireAdmin from '@/components/auth/RequireAdmin';
import RequireAuth from '@/components/auth/RequireAuth';

const useAuthMock = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/components/shared/LoadingState', () => ({
  default: () => <div>loading-state</div>,
}));

vi.mock('@/pages/Forbidden', () => ({
  default: () => <div>forbidden-page</div>,
}));

describe('route guards', () => {
  it('RequireAuth redirects unauthenticated user to login', () => {
    useAuthMock.mockReturnValue({ user: null, profile: null, loading: false });

    render(
      <MemoryRouter initialEntries={['/secure']}>
        <Routes>
          <Route path="/login" element={<div>login-page</div>} />
          <Route path="/secure" element={<RequireAuth><div>secure-page</div></RequireAuth>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('login-page')).toBeInTheDocument();
  });

  it('RequireAuth redirects unfinished onboarding user to onboarding', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u1' },
      profile: { onboarding_completed: false },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/secure']}>
        <Routes>
          <Route path="/onboarding" element={<div>onboarding-page</div>} />
          <Route path="/secure" element={<RequireAuth><div>secure-page</div></RequireAuth>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('onboarding-page')).toBeInTheDocument();
  });

  it('RequireAdmin renders forbidden page for non-admin user', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' }, loading: false, isAdmin: false });

    render(
      <MemoryRouter>
        <RequireAdmin>
          <div>admin-page</div>
        </RequireAdmin>
      </MemoryRouter>
    );

    expect(screen.getByText('forbidden-page')).toBeInTheDocument();
  });

  it('RequireAdmin renders children for admin user', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' }, loading: false, isAdmin: true });

    render(
      <MemoryRouter>
        <RequireAdmin>
          <div>admin-page</div>
        </RequireAdmin>
      </MemoryRouter>
    );

    expect(screen.getByText('admin-page')).toBeInTheDocument();
  });
});
