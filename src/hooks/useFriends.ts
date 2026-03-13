import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useFriends() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friends', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get friendships where current user is either side and status is accepted
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          user_profile:profiles!friendships_user_id_fkey(id, nickname, avatar_url, credit_score),
          friend_profile:profiles!friendships_friend_id_fkey(id, nickname, avatar_url, credit_score)
        `)
        .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
        .eq('status', 'accepted');
      if (error) throw error;
      // Normalize: return the "other" person's profile
      return (data || []).map((f: any) => ({
        friendshipId: f.id,
        profile: f.user_id === user!.id ? f.friend_profile : f.user_profile,
        createdAt: f.created_at,
      }));
    },
  });
}

export function useFriendRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friend-requests', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          user_profile:profiles!friendships_user_id_fkey(id, nickname, avatar_url, credit_score, uid)
        `)
        .eq('friend_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSearchUserByUid() {
  return useMutation({
    mutationFn: async (uid: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url, credit_score, uid')
        .eq('uid', uid.toUpperCase())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ friendId, groupId, message }: { friendId: string; groupId?: string; message?: string }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('friendships')
        .insert({ user_id: user.id, friend_id: friendId, group_id: groupId || null, message: message || null } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });
}

export function useRespondFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ friendshipId, accept }: { friendshipId: string; accept: boolean }) => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', friendshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });
}

export function useDeleteFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

export function useFriendshipStatus(friendId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friendship-status', user?.id, friendId],
    enabled: !!user && !!friendId && user.id !== friendId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(
          `and(user_id.eq.${user!.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user!.id})`
        )
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data; // null = not friends, check status for pending/accepted
    },
  });
}
