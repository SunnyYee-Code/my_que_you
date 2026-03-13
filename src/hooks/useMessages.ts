import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export function useMessages(groupId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, nickname, avatar_url)
        `)
        .eq('group_id', groupId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription for new messages
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`messages-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `group_id=eq.${groupId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', groupId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId, queryClient]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ groupId, content }: { groupId: string; content: string }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content,
          type: 'TEXT',
        });
      if (error) throw error;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', groupId] });
    },
  });
}
