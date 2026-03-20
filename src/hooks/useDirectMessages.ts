import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

// ── Global unread DM counts ──────────────────────────────────────────────────

/** Returns { total, byFriend: { [senderId]: count } } */
export function useUnreadDMCounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['unread-dms', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', user!.id)
        .eq('is_read', false);
      if (error) throw error;
      const byFriend: Record<string, number> = {};
      (data || []).forEach((msg) => {
        byFriend[msg.sender_id] = (byFriend[msg.sender_id] || 0) + 1;
      });
      const total = (data || []).length;
      return { total, byFriend };
    },
  });

  // Realtime: subscribe to ALL new DMs for current user
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`unread-dms-global-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['unread-dms', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  return query;
}

export function useMarkDMsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (senderId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', senderId)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-dms', user?.id] });
    },
  });
}

export interface GroupInviteMeta {
  group_id: string;
  is_host_invite: boolean;
  inviter_id: string;
  inviter_name: string;
  group_address: string;
  group_start_time: string;
  total_slots: number;
  needed_slots: number;
}

export function useDirectMessages(friendId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['direct-messages', user?.id, friendId],
    enabled: !!user && !!friendId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey(id, nickname, avatar_url)
        `)
        .or(
          `and(sender_id.eq.${user!.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user!.id})`
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user || !friendId) return;
    const channel = supabase
      .channel(`dm-${[user.id, friendId].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
      }, (payload: any) => {
        const msg = payload.new;
        if (
          (msg.sender_id === user.id && msg.receiver_id === friendId) ||
          (msg.sender_id === friendId && msg.receiver_id === user.id)
        ) {
          queryClient.invalidateQueries({ queryKey: ['direct-messages', user.id, friendId] });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, friendId, queryClient]);

  return query;
}

export function useSendDirectMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('direct_messages')
        .insert({ sender_id: user.id, receiver_id: receiverId, content, type: 'text' });
      if (error) throw error;
    },
    onSuccess: (_, { receiverId }) => {
      queryClient.invalidateQueries({ queryKey: ['direct-messages', user?.id, receiverId] });
    },
  });
}

export function useSendGroupInviteCard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      receiverId,
      meta,
    }: {
      receiverId: string;
      meta: GroupInviteMeta;
    }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          type: 'group_invite',
          content: `${meta.inviter_name} 邀请你加入拼团`,
          metadata: meta as any,
        });
      if (error) throw error;

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          type: 'group_invitation',
          title: meta.is_host_invite ? '房主邀请你加入拼团' : '好友邀请你加入拼团',
          content: `${meta.inviter_name} 邀请你加入拼团`,
          link_to: `/group/${meta.group_id}`,
        });
      if (notificationError) throw notificationError;
    },
    onSuccess: (_, { receiverId }) => {
      queryClient.invalidateQueries({ queryKey: ['direct-messages', user?.id, receiverId] });
    },
  });
}
