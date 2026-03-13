import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useGroupInvitations(groupId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group-invitations', groupId],
    enabled: !!groupId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_invitations')
        .select(`
          *,
          inviter:profiles!group_invitations_inviter_id_fkey(id, nickname, avatar_url),
          invitee:profiles!group_invitations_invitee_id_fkey(id, nickname, avatar_url)
        `)
        .eq('group_id', groupId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useInviteFriend() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ groupId, inviteeId }: { groupId: string; inviteeId: string }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('group_invitations')
        .insert({ inviter_id: user.id, invitee_id: inviteeId, group_id: groupId });
      if (error) throw error;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-invitations', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useRespondInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invitationId, accept }: { invitationId: string; accept: boolean }) => {
      const { error } = await supabase
        .from('group_invitations')
        .update({ status: accept ? 'accepted' : 'rejected', updated_at: new Date().toISOString() })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
