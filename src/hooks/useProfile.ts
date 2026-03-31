import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { buildFulfillmentProfile } from '@/lib/review-insights';

export function useProfileById(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyProfile() {
  const { user } = useAuth();
  return useProfileById(user?.id);
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async (updates: { nickname?: string; avatar_url?: string; city_id?: string }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      refreshProfile();
    },
  });
}

export function useCreditHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['credit-history', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_history')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useReviewsByTarget(targetId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', targetId],
    enabled: !!targetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(id, nickname, avatar_url)
        `)
        .eq('target_id', targetId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useGroupsByMember(userId: string | undefined) {
  return useQuery({
    queryKey: ['member-groups', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: memberships, error: mError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId!);
      if (mError) throw mError;

      if (!memberships?.length) return [];

      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .in('id', memberships.map(m => m.group_id))
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useFulfillmentProfiles(userIds: string[]) {
  return useQuery({
    queryKey: ['fulfillment-profiles', [...userIds].sort().join(',')],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
      if (uniqueUserIds.length === 0) {
        return {} as Record<string, ReturnType<typeof buildFulfillmentProfile>>;
      }

      const [reviewsResult, membershipsResult, exitsResult, hostedGroupsResult] = await Promise.all([
        supabase
          .from('reviews')
          .select('id, target_id, tags')
          .in('target_id', uniqueUserIds),
        supabase
          .from('group_members')
          .select('user_id, group_id')
          .in('user_id', uniqueUserIds),
        supabase
          .from('group_member_exits')
          .select('id, user_id, exit_type')
          .in('user_id', uniqueUserIds),
        supabase
          .from('groups')
          .select('id, status, host_id')
          .in('host_id', uniqueUserIds)
          .eq('status', 'COMPLETED'),
      ]);

      if (reviewsResult.error) throw reviewsResult.error;
      if (membershipsResult.error) throw membershipsResult.error;
      if (exitsResult.error) throw exitsResult.error;
      if (hostedGroupsResult.error) throw hostedGroupsResult.error;

      const groupIds = [...new Set((membershipsResult.data ?? []).map(item => item.group_id))];
      let groups: Array<{ id: string; status: string | null; host_id: string | null }> = [];

      if (groupIds.length > 0) {
        const groupsResult = await supabase
          .from('groups')
          .select('id, status, host_id')
          .in('id', groupIds);

        if (groupsResult.error) throw groupsResult.error;
        groups = (groupsResult.data ?? []).filter(group => group.status === 'COMPLETED');
      }

      const groupsById = new Map(groups.map(group => [group.id, group]));

      return uniqueUserIds.reduce((acc, userId) => {
        const memberGroups = (membershipsResult.data ?? [])
          .filter(item => item.user_id === userId)
          .map(item => groupsById.get(item.group_id))
          .filter(Boolean) as Array<{ id: string; status: string | null; host_id: string | null }>;
        const hostedGroups = (hostedGroupsResult.data ?? []).filter(group => group.host_id === userId);
        const userGroups = [...memberGroups, ...hostedGroups].filter(
          (group, index, list) => list.findIndex(item => item.id === group.id) === index,
        );

        acc[userId] = buildFulfillmentProfile({
          userId,
          reviews: reviewsResult.data ?? [],
          groups: userGroups,
          exits: exitsResult?.data ?? [],
        });

        return acc;
      }, {} as Record<string, ReturnType<typeof buildFulfillmentProfile>>);
    },
  });
}
