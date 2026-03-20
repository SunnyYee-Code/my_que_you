import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSendGroupInviteCard } from './useDirectMessages';

const { directMessageInsert, notificationInsert, from } = vi.hoisted(() => ({
  directMessageInsert: vi.fn(),
  notificationInsert: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from,
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'sender-1' } }),
}));

describe('useSendGroupInviteCard', () => {
  beforeEach(() => {
    directMessageInsert.mockReset();
    notificationInsert.mockReset();
    from.mockReset();

    directMessageInsert.mockResolvedValue({ error: null });
    notificationInsert.mockResolvedValue({ error: null });

    from.mockImplementation((table: string) => {
      if (table === 'direct_messages') {
        return { insert: directMessageInsert };
      }

      if (table === 'notifications') {
        return { insert: notificationInsert };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('writes a group_invitation notification for invited users', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useSendGroupInviteCard(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        receiverId: 'receiver-1',
        meta: {
          group_id: 'group-1',
          is_host_invite: true,
          inviter_id: 'sender-1',
          inviter_name: 'Alice',
          group_address: 'Test Road 1',
          group_start_time: '2026-03-20T12:00:00.000Z',
          total_slots: 5,
          needed_slots: 2,
        },
      });
    });

    expect(directMessageInsert).toHaveBeenCalledTimes(1);
    expect(notificationInsert).toHaveBeenCalledTimes(1);
    expect(notificationInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'receiver-1',
        type: 'group_invitation',
        link_to: '/group/group-1',
      })
    );
  });
});
