import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MemberTier } from '@/lib/membership';

export function useMembershipStatus(userId?: string) {
  const { user } = useAuth();
  const id = userId || user?.id;

  return useQuery({
    queryKey: ['membership', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, is_member, member_tier, show_in_leaderboard')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useMyMembershipStatus() {
  const { user } = useAuth();
  return useMembershipStatus(user?.id);
}

export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      isMember,
      memberTier = 'free',
    }: {
      userId: string;
      isMember: boolean;
      memberTier?: MemberTier;
    }) => {
      // Only admin/super_admin can update member status
      if (user?.user_metadata?.role !== 'admin' && user?.user_metadata?.role !== 'super_admin') {
        throw new Error('权限不足');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          is_member: isMember,
          member_tier: isMember ? memberTier : 'free',
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['membership', variables.userId] });
    },
  });
}

export function useUpdateLeaderboardVisibility() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (showInLeaderboard: boolean) => {
      if (!user?.id) throw new Error('用户未登录');

      const { error } = await supabase
        .from('profiles')
        .update({ show_in_leaderboard: showInLeaderboard })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership', user?.id] });
    },
  });
}

export function useBatchMembershipStatus(userIds: string[]) {
  return useQuery({
    queryKey: ['memberships', userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, is_member, member_tier')
        .in('id', userIds);

      if (error) throw error;
      return data;
    },
  });
}
