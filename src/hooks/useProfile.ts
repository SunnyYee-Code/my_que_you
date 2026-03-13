import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
