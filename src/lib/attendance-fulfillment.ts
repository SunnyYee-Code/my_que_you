/**
 * 签到和履约管理业务逻辑
 * 
 * 负责处理：
 * 1. 签到记录 (Attendance) - 记录用户是否签到
 * 2. 履约记录 (Fulfillment) - 记录用户履约状态（完全履约、爽约、异常离场等）
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];
export type AttendanceRecordInsert = Database['public']['Tables']['attendance_records']['Insert'];
export type AttendanceRecordUpdate = Database['public']['Tables']['attendance_records']['Update'];

export type FulfillmentRecord = Database['public']['Tables']['fulfillment_records']['Row'];
export type FulfillmentRecordInsert = Database['public']['Tables']['fulfillment_records']['Insert'];
export type FulfillmentRecordUpdate = Database['public']['Tables']['fulfillment_records']['Update'];

export type FulfillmentStatus = 'fulfilled' | 'no_show' | 'left_early' | 'cancelled';
export type NoShowReason = 'not_checked_in' | 'not_attended' | 'not_responded';
export type AppealStatus = 'pending' | 'approved' | 'rejected';

/**
 * 创建签到记录
 */
export async function createAttendanceRecord(
  groupId: string,
  userId: string,
  options?: {
    status?: 'checked_in' | 'not_checked_in';
    checkedInAt?: Date;
    confirmedBy?: string;
    notes?: string;
  }
) {
  const { data, error } = await supabase
    .from('attendance_records')
    .insert({
      group_id: groupId,
      user_id: userId,
      status: options?.status ?? 'checked_in',
      checked_in_at: options?.checkedInAt?.toISOString() ?? new Date().toISOString(),
      confirmed_by: options?.confirmedBy,
      notes: options?.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 查询签到记录
 */
export async function getAttendanceRecord(groupId: string, userId: string) {
  const { data, error } = await supabase
    .from('attendance_records')
    .select()
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  // 如果未找到记录，不抛出错误，返回null
  if (error?.code === 'PGRST116') {
    return null;
  }

  if (error) throw error;
  return data;
}

/**
 * 查询群组的所有签到记录
 */
export async function getGroupAttendanceRecords(groupId: string) {
  const { data, error } = await supabase
    .from('attendance_records')
    .select()
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * 更新签到状态
 */
export async function updateAttendanceStatus(
  groupId: string,
  userId: string,
  status: 'checked_in' | 'not_checked_in',
  confirmedBy?: string
) {
  const { data, error } = await supabase
    .from('attendance_records')
    .update({
      status,
      confirmed_by: confirmedBy,
      confirmed_at: new Date().toISOString(),
    })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 创建履约记录
 */
export async function createFulfillmentRecord(
  groupId: string,
  userId: string,
  status: FulfillmentStatus,
  options?: {
    noShowReason?: NoShowReason;
    notes?: string;
    attendanceRecordId?: string;
  }
) {
  // 验证no_show_reason只在status为no_show时才能有值
  if (status !== 'no_show' && options?.noShowReason) {
    throw new Error('no_show_reason只能在status为no_show时设置');
  }

  const { data, error } = await supabase
    .from('fulfillment_records')
    .insert({
      group_id: groupId,
      user_id: userId,
      status,
      no_show_reason: options?.noShowReason,
      notes: options?.notes,
      attendance_record_id: options?.attendanceRecordId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 查询用户的履约记录
 */
export async function getUserFulfillmentRecords(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  const { data, error } = await supabase
    .from('fulfillment_records')
    .select('*, attendance_records(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

/**
 * 查询爽约记录摘要（用于用户资料展示）
 */
export async function getUserNoShowSummary(userId: string) {
  const { data, error } = await supabase
    .from('fulfillment_records')
    .select('status, created_at')
    .eq('user_id', userId)
    .eq('status', 'no_show')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 如果没有爽约记录，返回null
  if (error?.code === 'PGRST116') {
    return null;
  }

  if (error) throw error;
  return data;
}

/**
 * 获取用户的爽约统计
 */
export async function getUserNoShowStats(userId: string, days: number = 90) {
  const { data, error } = await supabase
    .from('fulfillment_records')
    .select('status')
    .eq('user_id', userId)
    .eq('status', 'no_show')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

  if (error) throw error;

  return {
    totalNoShowCount: data?.length ?? 0,
    period: `${days}天`,
  };
}

/**
 * 提交申诉
 */
export async function submitFulfillmentAppeal(
  fulfillmentRecordId: string,
  reason: string
) {
  const { data, error } = await supabase
    .from('fulfillment_records')
    .update({
      appeal_status: 'pending',
      appeal_reason: reason,
      appeal_created_at: new Date().toISOString(),
    })
    .eq('id', fulfillmentRecordId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 处理申诉（仅管理员可用）
 */
export async function resolveFulfillmentAppeal(
  fulfillmentRecordId: string,
  approved: boolean
) {
  const { data, error } = await supabase
    .from('fulfillment_records')
    .update({
      appeal_status: approved ? 'approved' : 'rejected',
    })
    .eq('id', fulfillmentRecordId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 确定群组成员的履约状态
 * 根据签到记录自动生成履约记录
 */
export async function determineFulfillmentStatus(
  groupId: string,
  userId: string
): Promise<FulfillmentStatus> {
  const attendanceRecord = await getAttendanceRecord(groupId, userId);

  if (!attendanceRecord) {
    // 没有签到记录 = 未响应
    return 'no_show';
  }

  if (attendanceRecord.status === 'checked_in') {
    // 已签到 = 履约
    return 'fulfilled';
  } else {
    // 签到状态为未签到
    return 'no_show';
  }
}
