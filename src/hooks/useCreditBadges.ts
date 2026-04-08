import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeAllBadges, type BadgeInput, type EarnedBadge } from '@/lib/credit-badges';

const STALE_TIME = 5 * 60 * 1000; // 5 分钟

type FulfillmentRow = { status: 'fulfilled' | 'no_show' | 'left_early' | 'cancelled' };
type FulfillmentRowWithUser = FulfillmentRow & { user_id: string };

/**
 * 获取单个用户的勋章列表
 * @param userId 目标用户 ID
 * @param creditScore 信用分（从已有 profile 数据传入，避免重复请求）
 */
export function useUserBadges(
  userId: string | undefined,
  creditScore: number | undefined,
): { data: EarnedBadge[]; isLoading: boolean; error: Error | null } {
  return useQuery({
    queryKey: ['credit-badges', userId],
    enabled: !!userId && creditScore !== undefined,
    staleTime: STALE_TIME,
    queryFn: async (): Promise<EarnedBadge[]> => {
      if (!userId || creditScore === undefined) return [];

      const [fulfillmentResult, membershipResult, reviewResult] = await Promise.all([
        (supabase as any)
          .from('fulfillment_records')
          .select('status')
          .eq('user_id', userId) as Promise<{ data: FulfillmentRow[] | null; error: unknown }>,
        supabase
          .from('group_members')
          .select('joined_at')
          .eq('user_id', userId),
        supabase
          .from('reviews')
          .select('attitude, punctuality, skill')
          .eq('target_id', userId),
      ]);

      const input: BadgeInput = {
        creditScore,
        fulfillmentRecords: fulfillmentResult.data ?? [],
        groupMemberships: membershipResult.data ?? [],
        reviews: reviewResult.data ?? [],
      };

      return computeAllBadges(input);
    },
  });
}

/**
 * 批量获取多个用户的勋章列表（用于列表页，避免 N+1 查询）
 * @param users 用户列表，包含 userId 和 creditScore
 */
export function useMultiUserBadges(
  users: Array<{ userId: string; creditScore: number }>,
): { data: Record<string, EarnedBadge[]>; isLoading: boolean } {
  const userIds = users.map(u => u.userId).filter(Boolean).sort();
  const creditScoreMap = Object.fromEntries(users.map(u => [u.userId, u.creditScore]));

  return useQuery({
    queryKey: ['credit-badges-multi', userIds.join(',')],
    enabled: userIds.length > 0,
    staleTime: STALE_TIME,
    queryFn: async (): Promise<Record<string, EarnedBadge[]>> => {
      if (userIds.length === 0) return {};

      const [fulfillmentResult, membershipResult, reviewResult] = await Promise.all([
        (supabase as any)
          .from('fulfillment_records')
          .select('user_id, status')
          .in('user_id', userIds) as Promise<{ data: FulfillmentRowWithUser[] | null; error: unknown }>,
        supabase
          .from('group_members')
          .select('user_id, joined_at')
          .in('user_id', userIds),
        supabase
          .from('reviews')
          .select('target_id, attitude, punctuality, skill')
          .in('target_id', userIds),
      ]);

      // 按用户 ID 分组数据
      const fulfillmentByUser: Record<string, BadgeInput['fulfillmentRecords']> = {};
      const membershipByUser: Record<string, BadgeInput['groupMemberships']> = {};
      const reviewsByUser: Record<string, BadgeInput['reviews']> = {};

      for (const uid of userIds) {
        fulfillmentByUser[uid] = [];
        membershipByUser[uid] = [];
        reviewsByUser[uid] = [];
      }

      for (const r of (fulfillmentResult.data ?? [])) {
        if (r.user_id in fulfillmentByUser) {
          fulfillmentByUser[r.user_id].push({ status: r.status });
        }
      }
      for (const m of (membershipResult.data ?? [])) {
        if (m.user_id in membershipByUser) {
          membershipByUser[m.user_id].push({ joined_at: m.joined_at });
        }
      }
      for (const rv of (reviewResult.data ?? [])) {
        if (rv.target_id in reviewsByUser) {
          reviewsByUser[rv.target_id].push({
            attitude: rv.attitude,
            punctuality: rv.punctuality,
            skill: rv.skill,
          });
        }
      }

      // 计算每个用户的勋章
      const result: Record<string, EarnedBadge[]> = {};
      for (const uid of userIds) {
        const input: BadgeInput = {
          creditScore: creditScoreMap[uid] ?? 100,
          fulfillmentRecords: fulfillmentByUser[uid],
          groupMemberships: membershipByUser[uid],
          reviews: reviewsByUser[uid],
        };
        result[uid] = computeAllBadges(input);
      }

      return result;
    },
  });
}
