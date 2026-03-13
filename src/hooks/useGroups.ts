import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useGroupsByCity(cityId: string) {
  return useQuery({
    queryKey: ['groups', cityId],
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          host:profiles!groups_host_id_fkey(id, nickname, avatar_url, credit_score),
          members:group_members(user_id, profiles:profiles(id, nickname, avatar_url, credit_score))
        `)
        .eq('city_id', cityId)
        .eq('is_visible', true)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useGroupDetail(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group', groupId],
    enabled: !!groupId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          host:profiles!groups_host_id_fkey(id, nickname, avatar_url, credit_score),
          members:group_members(user_id, profiles:profiles(id, nickname, avatar_url, credit_score))
        `)
        .eq('id', groupId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      city_id: string;
      start_time: string;
      end_time: string;
      address: string;
      latitude?: number;
      longitude?: number;
      total_slots: number;
      needed_slots: number;
      play_style?: string;
      game_note?: string;
    }) => {
      if (!user) throw new Error('请先登录');

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          host_id: user.id,
          ...input,
        })
        .select()
        .single();
      if (groupError) throw groupError;

      // Add host as first member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id });
      if (memberError) throw memberError;

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useMyGroups() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-groups', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get groups where user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user!.id);
      if (memberError) throw memberError;

      const groupIds = memberGroups.map(m => m.group_id);
      if (groupIds.length === 0) return { hosted: [], joined: [] };

      const { data: groups, error } = await supabase
        .from('groups')
        .select(`
          *,
          host:profiles!groups_host_id_fkey(id, nickname, avatar_url, credit_score),
          members:group_members(user_id, profiles:profiles(id, nickname, avatar_url, credit_score))
        `)
        .in('id', groupIds)
        .order('start_time', { ascending: false });
      if (error) throw error;

      return {
        hosted: (groups || []).filter(g => g.host_id === user!.id),
        joined: (groups || []).filter(g => g.host_id !== user!.id),
      };
    },
  });
}

export function useJoinRequests(groupId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['join-requests', groupId || 'host', user?.id],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from('join_requests')
        .select(`
          *,
          user:profiles!join_requests_user_id_fkey(id, nickname, avatar_url, credit_score),
          group:groups(id, address, start_time, status)
        `)
        .order('created_at', { ascending: false });

      if (groupId) {
        query = query.eq('group_id', groupId);
      } else {
        // Host view: all requests for groups I host
        query = query.eq('host_id', user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status, groupId, userId }: {
      requestId: string;
      status: 'APPROVED' | 'REJECTED';
      groupId: string;
      userId: string;
    }) => {
      if (status === 'APPROVED') {
        // Use security definer function so host can add members
        const { error } = await supabase.rpc('approve_join_request', {
          _request_id: requestId,
          _group_id: groupId,
          _user_id: userId,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('join_requests')
          .update({ status })
          .eq('id', requestId);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
    },
  });
}
