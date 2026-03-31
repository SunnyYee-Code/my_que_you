import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserBlacklistState, type UserBlacklistEntryLike } from '@/lib/user-blacklist';

export function useBlacklist() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['blacklist', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_blacklist')
        .select(`
          id,
          blocker_id,
          blocked_id,
          reason,
          created_at,
          blocked_profile:profiles!user_blacklist_blocked_id_fkey(id, nickname, uid, avatar_url, credit_score)
        `)
        .eq('blocker_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBlacklistStatus(targetUserId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['blacklist-status', user?.id, targetUserId],
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_blacklist')
        .select('id, blocker_id, blocked_id')
        .or(
          `and(blocker_id.eq.${user!.id},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${user!.id})`,
        );
      if (error) throw error;
      const state = getUserBlacklistState((data ?? []) as UserBlacklistEntryLike[], user!.id, targetUserId!);
      const ownEntry = (data ?? []).find(
        (entry: any) => entry.blocker_id === user!.id && entry.blocked_id === targetUserId,
      );
      return {
        ...state,
        entryId: ownEntry?.id ?? null,
      };
    },
  });
}

export function useAddToBlacklist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      blockedUserId,
      reason,
    }: {
      blockedUserId: string;
      reason?: string;
    }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase.from('user_blacklist').insert({
        blocker_id: user.id,
        blocked_id: blockedUserId,
        reason: reason ?? null,
      });
      if (error) throw error;

      const { error: friendshipCleanupError } = await supabase
        .from('friendships')
        .delete()
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${blockedUserId}),and(user_id.eq.${blockedUserId},friend_id.eq.${user.id})`,
        );
      if (friendshipCleanupError) throw friendshipCleanupError;
    },
    onSuccess: async (_, { blockedUserId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['blacklist', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['blacklist-status', user?.id, blockedUserId] }),
        queryClient.invalidateQueries({ queryKey: ['direct-messages', user?.id, blockedUserId] }),
        queryClient.invalidateQueries({ queryKey: ['friends', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['friend-requests', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['friendship-status', user?.id, blockedUserId] }),
      ]);
    },
  });
}

export function useRemoveFromBlacklist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('user_blacklist')
        .delete()
        .eq('id', entryId)
        .eq('blocker_id', user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['blacklist', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['blacklist-status', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['friends', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['friend-requests', user?.id] }),
      ]);
    },
  });
}
