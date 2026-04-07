import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  createAttendanceRecord,
  getAttendanceRecord,
  getGroupAttendanceRecords,
  updateAttendanceStatus,
  createFulfillmentRecord,
  getUserFulfillmentRecords,
  getUserNoShowSummary,
  getUserNoShowStats,
  submitFulfillmentAppeal,
} from '@/lib/attendance-fulfillment';

/**
 * Hook: 获取单个群组成员的签到记录
 */
export function useAttendanceRecord(groupId: string | null, userId: string | null) {
  return useQuery({
    queryKey: ['attendance', groupId, userId],
    enabled: !!groupId && !!userId,
    queryFn: async () => {
      if (!groupId || !userId) return null;
      return getAttendanceRecord(groupId, userId);
    },
  });
}

/**
 * Hook: 获取群组的所有签到记录
 */
export function useGroupAttendanceRecords(groupId: string | null) {
  return useQuery({
    queryKey: ['group-attendance', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      if (!groupId) return [];
      return getGroupAttendanceRecords(groupId);
    },
  });
}

/**
 * Hook: 创建/更新签到记录
 */
export function useCheckIn() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      groupId: string;
      userId?: string;
      status: 'checked_in' | 'not_checked_in';
    }) => {
      const userId = params.userId || user?.id;
      if (!userId) throw new Error('用户未登录');

      // 先查询是否已有记录
      const existing = await getAttendanceRecord(params.groupId, userId);

      if (existing) {
        // 更新现有记录
        return updateAttendanceStatus(params.groupId, userId, params.status, user?.id);
      } else {
        // 创建新记录
        return createAttendanceRecord(params.groupId, userId, {
          status: params.status,
          confirmedBy: user?.id,
        });
      }
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', params.groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-attendance', params.groupId] });
    },
  });
}

/**
 * Hook: 获取用户的履约记录
 */
export function useFulfillmentRecords(userId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['fulfillment-records', userId],
    enabled: enabled && !!userId,
    queryFn: async () => {
      if (!userId) return [];
      return getUserFulfillmentRecords(userId);
    },
  });
}

/**
 * Hook: 获取用户的爽约摘要
 */
export function useNoShowSummary(userId: string | null) {
  return useQuery({
    queryKey: ['no-show-summary', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      return getUserNoShowSummary(userId);
    },
  });
}

/**
 * Hook: 获取用户的爽约统计
 */
export function useNoShowStats(userId: string | null, days: number = 90) {
  return useQuery({
    queryKey: ['no-show-stats', userId, days],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      return getUserNoShowStats(userId, days);
    },
  });
}

/**
 * Hook: 创建履约记录
 */
export function useCreateFulfillmentRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      groupId: string;
      userId: string;
      status: 'fulfilled' | 'no_show' | 'left_early' | 'cancelled';
      noShowReason?: 'not_checked_in' | 'not_attended' | 'not_responded';
      notes?: string;
    }) => {
      return createFulfillmentRecord(
        params.groupId,
        params.userId,
        params.status,
        {
          noShowReason: params.noShowReason,
          notes: params.notes,
        }
      );
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-records', params.userId] });
      queryClient.invalidateQueries({ queryKey: ['no-show-summary', params.userId] });
      queryClient.invalidateQueries({ queryKey: ['no-show-stats', params.userId] });
    },
  });
}

/**
 * Hook: 提交申诉
 */
export function useSubmitAppeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      fulfillmentRecordId: string;
      reason: string;
    }) => {
      return submitFulfillmentAppeal(params.fulfillmentRecordId, params.reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-records'] });
    },
  });
}
