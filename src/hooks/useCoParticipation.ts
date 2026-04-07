import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const PARTNER_TAG_OPTIONS = [
  '好搭档',
  '常约对象',
  '新朋友',
  '牌品好',
  '准时靠谱',
  '欢迎再约',
] as const;

export type PartnerTag = (typeof PARTNER_TAG_OPTIONS)[number];

export interface FrequentPartner {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  creditScore: number;
  coCount: number;
  lastTogetherAt: string | null;
  tags: string[];
}

/**
 * 获取当前用户的常约牌友列表（基于共同完局记录沉淀）
 * 查询逻辑：找出与当前用户共同参与过已完成拼团的其他用户，按共同参与次数和最近参与时间排序
 */
export function useFrequentPartners() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['frequent-partners', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // 1. 获取当前用户参与过的已完成拼团
      const { data: myMemberships, error: membershipsError } = await supabase
        .from('group_members')
        .select('group_id, groups!inner(id, status, end_time)')
        .eq('user_id', user!.id)
        .eq('groups.status', 'COMPLETED');

      if (membershipsError) throw membershipsError;
      if (!myMemberships || myMemberships.length === 0) return [];

      const completedGroupIds = myMemberships.map((m: any) => m.group_id);
      const groupEndTimes: Record<string, string> = {};
      for (const m of myMemberships as any[]) {
        if (m.groups?.end_time) {
          groupEndTimes[m.group_id] = m.groups.end_time;
        }
      }

      // 2. 找出这些拼团中的其他成员
      const { data: coMembers, error: coError } = await supabase
        .from('group_members')
        .select('user_id, group_id, profiles(id, nickname, avatar_url, credit_score)')
        .in('group_id', completedGroupIds)
        .neq('user_id', user!.id);

      if (coError) throw coError;
      if (!coMembers || coMembers.length === 0) return [];

      // 3. 按 user_id 聚合：计算共同参与次数和最近共同参与时间
      const partnerMap = new Map<string, { profile: any; groupIds: string[] }>();
      for (const m of coMembers as any[]) {
        if (!m.profiles) continue;
        const existing = partnerMap.get(m.user_id);
        if (existing) {
          existing.groupIds.push(m.group_id);
        } else {
          partnerMap.set(m.user_id, { profile: m.profiles, groupIds: [m.group_id] });
        }
      }

      // 4. 获取当前用户对这些牌友的标签
      const partnerIds = Array.from(partnerMap.keys());
      const { data: tags, error: tagsError } = await supabase
        .from('partner_tags')
        .select('partner_id, tag')
        .eq('user_id', user!.id)
        .in('partner_id', partnerIds);

      if (tagsError) throw tagsError;

      const tagsByPartner: Record<string, string[]> = {};
      for (const t of tags || []) {
        if (!tagsByPartner[t.partner_id]) tagsByPartner[t.partner_id] = [];
        tagsByPartner[t.partner_id].push(t.tag);
      }

      // 5. 组装结果，取最近共同参与时间
      const partners: FrequentPartner[] = [];
      for (const [userId, { profile, groupIds }] of partnerMap.entries()) {
        const latestEndTime = groupIds
          .map((gid) => groupEndTimes[gid] || null)
          .filter(Boolean)
          .sort()
          .reverse()[0] || null;

        partners.push({
          userId,
          nickname: profile.nickname || '未知用户',
          avatarUrl: profile.avatar_url,
          creditScore: profile.credit_score ?? 100,
          coCount: groupIds.length,
          lastTogetherAt: latestEndTime,
          tags: tagsByPartner[userId] || [],
        });
      }

      // 按共同参与次数降序，次数相同则按最近时间降序
      partners.sort((a, b) => {
        if (b.coCount !== a.coCount) return b.coCount - a.coCount;
        if (b.lastTogetherAt && a.lastTogetherAt) {
          return b.lastTogetherAt.localeCompare(a.lastTogetherAt);
        }
        return 0;
      });

      return partners.slice(0, 30);
    },
  });
}

/** 获取当前用户对某个牌友打的标签 */
export function usePartnerTags(partnerId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['partner-tags', user?.id, partnerId],
    enabled: !!user && !!partnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_tags')
        .select('id, tag, created_at')
        .eq('user_id', user!.id)
        .eq('partner_id', partnerId!);

      if (error) throw error;
      return data || [];
    },
  });
}

/** 添加关系标签 */
export function useAddPartnerTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ partnerId, tag }: { partnerId: string; tag: string }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('partner_tags')
        .insert({ user_id: user.id, partner_id: partnerId, tag } as any);
      if (error) throw error;
    },
    onSuccess: (_data, { partnerId }) => {
      queryClient.invalidateQueries({ queryKey: ['partner-tags', user?.id, partnerId] });
      queryClient.invalidateQueries({ queryKey: ['frequent-partners', user?.id] });
    },
  });
}

/** 删除关系标签 */
export function useRemovePartnerTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ partnerId, tag }: { partnerId: string; tag: string }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('partner_tags')
        .delete()
        .eq('user_id', user!.id)
        .eq('partner_id', partnerId)
        .eq('tag', tag);
      if (error) throw error;
    },
    onSuccess: (_data, { partnerId }) => {
      queryClient.invalidateQueries({ queryKey: ['partner-tags', user?.id, partnerId] });
      queryClient.invalidateQueries({ queryKey: ['frequent-partners', user?.id] });
    },
  });
}
