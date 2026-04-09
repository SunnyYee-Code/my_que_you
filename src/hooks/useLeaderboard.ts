import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export type LeaderboardPeriod = 'weekly' | 'monthly';

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  creditScore: number;
  participationCount: number;
  rank: number;
}

/**
 * 活跃度榜 - 统计用户在指定周期内参与的局数
 * 数据来源：group_members 表，不接受用户手动申报
 * 统计口径：加入时间（joined_at）在统计周期内的 group_member 记录数
 */
export function useLeaderboard(period: LeaderboardPeriod) {
  return useQuery({
    queryKey: ['leaderboard', period],
    queryFn: async () => {
      const since = period === 'weekly'
        ? subDays(new Date(), 7).toISOString()
        : subDays(new Date(), 30).toISOString();

      const { data, error } = await supabase
        .from('group_members')
        .select('user_id, joined_at, profiles!inner(nickname, avatar_url, credit_score, show_in_leaderboard)')
        .gte('joined_at', since)
        .eq('profiles.show_in_leaderboard', true);

      if (error) throw error;

      // 按用户聚合参与局数
      const userMap = new Map<string, { nickname: string; avatarUrl: string | null; creditScore: number; count: number }>();

      for (const row of data || []) {
        const uid = row.user_id;
        const profile = row.profiles as { nickname: string; avatar_url: string | null; credit_score: number };
        if (!userMap.has(uid)) {
          userMap.set(uid, {
            nickname: profile.nickname || '未知用户',
            avatarUrl: profile.avatar_url,
            creditScore: profile.credit_score ?? 100,
            count: 0,
          });
        }
        userMap.get(uid)!.count++;
      }

      // 排序并分配名次
      const entries: LeaderboardEntry[] = Array.from(userMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .map(([userId, info], index) => ({
          userId,
          nickname: info.nickname,
          avatarUrl: info.avatarUrl,
          creditScore: info.creditScore,
          participationCount: info.count,
          rank: index + 1,
        }));

      return entries;
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
}

/**
 * 获取指定用户在榜单中的排名
 */
export function useUserLeaderboardRank(userId: string | undefined, period: LeaderboardPeriod = 'monthly') {
  const { data: entries = [], isLoading } = useLeaderboard(period);

  const entry = userId ? entries.find(e => e.userId === userId) : undefined;

  return {
    rank: entry?.rank ?? null,
    participationCount: entry?.participationCount ?? 0,
    totalUsers: entries.length,
    isLoading,
  };
}
