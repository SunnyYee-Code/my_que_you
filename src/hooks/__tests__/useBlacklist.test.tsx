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
  },
}));

import { useAddToBlacklist } from '@/hooks/useBlacklist';

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('useAddToBlacklist', () => {
  it('creates blacklist entry and cleans up existing friendship relations between both users', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });

    const friendshipOrMock = vi.fn().mockResolvedValue({ error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === 'user_blacklist') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      if (table === 'friendships') {
        return {
          delete: vi.fn(() => ({
            or: friendshipOrMock,
          })),
        };
      }

      throw new Error(`unexpected table ${table}`);
    });

    const { result } = renderHook(() => useAddToBlacklist(), { wrapper });

    await result.current.mutateAsync({ blockedUserId: 'user-2' });

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledWith('friendships');
      expect(friendshipOrMock).toHaveBeenCalledWith(
        'and(user_id.eq.user-1,friend_id.eq.user-2),and(user_id.eq.user-2,friend_id.eq.user-1)',
      );
    });
  });
});
