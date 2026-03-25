import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const { useAuthMock, fromMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
    functions: { invoke: vi.fn() },
  },
}));

import { useCanJoinGroup } from '@/hooks/useJoinGroup';

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('useCanJoinGroup', () => {
  it('returns 已加入 when membership exists', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    fromMock.mockImplementation((table: string) => {
      if (table === 'group_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'm1' } }) }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { result } = renderHook(() => useCanJoinGroup('group-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ canJoin: false, reason: '已加入' });
    });
  });

  it('returns 审核中 when pending request exists', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    fromMock.mockImplementation((table: string) => {
      if (table === 'group_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
            }),
          }),
        };
      }
      if (table === 'join_requests') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  limit: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'r1', status: 'PENDING' } }) }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { result } = renderHook(() => useCanJoinGroup('group-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ canJoin: false, reason: '审核中' });
    });
  });

  it('returns canJoin true when no membership or pending request', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    fromMock.mockImplementation((table: string) => {
      if (table === 'group_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
            }),
          }),
        };
      }
      if (table === 'join_requests') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  limit: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { result } = renderHook(() => useCanJoinGroup('group-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ canJoin: true, reason: null });
    });
  });
});
