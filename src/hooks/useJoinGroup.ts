import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { REAL_NAME_SCENES, adaptRealNameSnapshot } from '@/constants/realName';
import {
  shouldBlockByRestrictionLevel,
  shouldShowRealNameGuard,
} from '@/lib/real-name-verification';

/**
 * Check if the current user can join a specific group.
 * Returns: { canJoin, reason, existingRequest }
 */
export function useCanJoinGroup(groupId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['can-join', groupId, user?.id],
    enabled: !!user && !!groupId,
    queryFn: async () => {
      // Check if already a member
      const { data: membership } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (membership) return { canJoin: false, reason: '已加入' as const };

      // Check if already has a pending request
      const { data: request } = await supabase
        .from('join_requests')
        .select('id, status')
        .eq('group_id', groupId)
        .eq('user_id', user!.id)
        .eq('status', 'PENDING')
        .limit(1)
        .maybeSingle();
      if (request) return { canJoin: false, reason: '审核中' as const };

      return { canJoin: true, reason: null };
    },
  });
}

/**
 * Batch check join status for multiple groups (used on Index page).
 * Returns a map of groupId -> { isMember, hasPending }
 */
export function useGroupJoinStatuses(groupIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['join-statuses', user?.id, groupIds.sort().join(',')],
    enabled: !!user && groupIds.length > 0,
    queryFn: async () => {
      const [{ data: memberships }, { data: requests }] = await Promise.all([
        supabase.from('group_members').select('group_id').eq('user_id', user!.id).in('group_id', groupIds),
        supabase.from('join_requests').select('group_id, status').eq('user_id', user!.id).in('group_id', groupIds),
      ]);

      const statusMap: Record<string, { isMember: boolean; isPending: boolean; isHost: boolean }> = {};
      for (const gid of groupIds) {
        statusMap[gid] = { isMember: false, isPending: false, isHost: false };
      }
      // Use actual group_members as source of truth for membership
      for (const m of memberships || []) {
        if (statusMap[m.group_id]) statusMap[m.group_id].isMember = true;
      }
      for (const r of requests || []) {
        if (r.status === 'PENDING' && statusMap[r.group_id]) statusMap[r.group_id].isPending = true;
        // Don't use APPROVED requests - rely on group_members instead
      }
      return statusMap;
    },
  });
}

export function useQuickJoin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, hostId }: { groupId: string; hostId: string }) => {
      if (!user) throw new Error('请先登录');

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('请先登录');
      }

      const realNameResponse = await fetch('/functions/v1/real-name-verification/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const realNamePayload = await realNameResponse.json().catch(() => ({}));
      if (!realNameResponse.ok) {
        throw new Error(realNamePayload?.message || realNamePayload?.error || '实名认证状态获取失败，请稍后重试');
      }

      const realNameSnapshot = adaptRealNameSnapshot(realNamePayload);
      const shouldGuardJoin = shouldShowRealNameGuard(realNameSnapshot, REAL_NAME_SCENES.GROUP_JOIN);
      const shouldBlockJoin = shouldGuardJoin && shouldBlockByRestrictionLevel(realNameSnapshot.restriction_level);
      if (shouldBlockJoin) {
        throw new Error('当前场景需先完成实名认证后继续。');
      }

      // Check daily join limit
      const { data: limitCheck, error: limitError } = await supabase.functions.invoke('check-group-limits', {
        body: { action: 'check_join' },
      });
      if (limitError) throw limitError;
      if (!limitCheck?.allowed) {
        throw new Error(limitCheck?.message || '今日参与团数已达上限');
      }

      const { error } = await supabase.from('join_requests').insert({
        group_id: groupId,
        user_id: user.id,
        host_id: hostId,
      });
      if (error) throw error;

      // Record the join action
      await supabase.functions.invoke('check-group-limits', {
        body: { action: 'record_join' },
      });
    },
    onSuccess: () => {
      toast({ title: '申请已提交', description: '等待房主审核' });
      queryClient.invalidateQueries({ queryKey: ['join-statuses'] });
    },
    onError: (err: any) => {
      toast({ title: '申请失败', description: err.message, variant: 'destructive' });
    },
  });
}
