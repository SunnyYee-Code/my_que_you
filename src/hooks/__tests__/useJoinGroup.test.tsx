import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const { useAuthMock, fromMock, invokeMock, getSessionMock, toastMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  fromMock: vi.fn(),
  invokeMock: vi.fn(),
  getSessionMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
    functions: { invoke: invokeMock },
    auth: {
      getSession: getSessionMock,
    },
  },
}));

import { useCanJoinGroup, useQuickJoin } from '@/hooks/useJoinGroup';

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

describe('useQuickJoin', () => {
  it('blocks join when real-name restriction still applies to group_join', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
    });
    invokeMock.mockReset();
    fromMock.mockReset();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'unverified',
        display_status_text: '未实名',
        can_submit: true,
        can_resubmit: false,
        can_cancel: false,
        reject_reason_text: null,
        verified_at: null,
        last_submitted_at: null,
        restriction_level: 'limited',
        restriction_scenes: ['group_join'],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useQuickJoin(), { wrapper });

    await expect(result.current.mutateAsync({ groupId: 'group-1', hostId: 'host-1' })).rejects.toThrow(
      '当前场景需先完成实名认证后继续。',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/functions/v1/real-name-verification/status',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
    expect(invokeMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
