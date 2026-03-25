import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.hoisted(() => vi.fn());
const onAuthStateChangeMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      signOut: signOutMock,
    },
    from: fromMock,
  },
}));

import { AuthProvider, useAuth } from '../AuthContext';

function Consumer() {
  const { isAdmin, isSuperAdmin, isTest, profile } = useAuth();
  return (
    <div>
      <span>{isAdmin ? 'admin-yes' : 'admin-no'}</span>
      <span>{isSuperAdmin ? 'super-yes' : 'super-no'}</span>
      <span>{isTest ? 'test-yes' : 'test-no'}</span>
      <span>{profile?.nickname}</span>
    </div>
  );
}

describe('AuthContext', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('derives admin and super admin roles from user roles', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } });
    onAuthStateChangeMock.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { nickname: '管理员' } }) }) }) };
      }
      if (table === 'user_roles') {
        return { select: () => ({ eq: () => Promise.resolve({ data: [{ role: 'super_admin' }, { role: 'test' }] }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('admin-yes')).toBeInTheDocument();
      expect(screen.getByText('super-yes')).toBeInTheDocument();
      expect(screen.getByText('test-yes')).toBeInTheDocument();
      expect(screen.getByText('管理员')).toBeInTheDocument();
    });
  });
});
