import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

import { useAccountDeletionStatus, useApplyAccountDeletion } from '@/hooks/useAccountDeletion';

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('useAccountDeletion', () => {
  it('loads deletion status with bearer authorization', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-abc',
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        applyStatus: 'not_applied',
        canOperate: true,
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAccountDeletionStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toMatchObject({
        applyStatus: 'not_applied',
        canOperate: true,
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/functions/v1/account-deletion/status',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-abc',
        }),
      }),
    );

    vi.unstubAllGlobals();
  });

  it('submits deletion application with bearer authorization', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-xyz',
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        applyStatus: 'cooling_off',
        canOperate: true,
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useApplyAccountDeletion(), { wrapper });

    await result.current.mutateAsync();

    expect(fetchMock).toHaveBeenCalledWith(
      '/functions/v1/account-deletion/apply',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-xyz',
        }),
      }),
    );

    vi.unstubAllGlobals();
  });
});
