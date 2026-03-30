import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS = {
  NOT_APPLIED: 'not_applied',
  COOLING_OFF: 'cooling_off',
  PROCESSING: 'processing',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

type ApplyStatus = typeof STATUS[keyof typeof STATUS];
type AvailableAction = 'apply' | 'cancel';

type DeletionRequestRow = {
  id: string;
  user_id: string;
  status: ApplyStatus;
  cooling_off_expire_at: string;
  forbidden_reason: string | null;
  result_reason: string | null;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  nickname: string | null;
  can_create_group: boolean;
  can_join_group: boolean;
  deletion_status: string;
};

const ERROR_MAP = {
  ACTIVE_GROUPS: {
    code: 'ACCOUNT_DELETION_ACTIVE_GROUPS',
    message: '你有进行中的牌局，暂不可申请注销',
  },
  INVALID_APPLY_STATUS: {
    code: 'ACCOUNT_DELETION_INVALID_APPLY_STATUS',
    message: '当前状态不可重复申请注销',
  },
  INVALID_CANCEL_STATUS: {
    code: 'ACCOUNT_DELETION_INVALID_CANCEL_STATUS',
    message: '当前状态不可撤销注销申请',
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) throw httpError(401, 'UNAUTHORIZED', '缺少登录态');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) throw httpError(401, 'UNAUTHORIZED', '登录态已失效');
    const userId = claimsData.claims.sub;

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    if (req.method === 'GET' && action === 'status') {
      const snapshot = await getSnapshot(admin, userId);
      return jsonResponse(snapshot);
    }

    if (req.method === 'POST' && action === 'apply') {
      const snapshot = await applyDeletion(admin, userId);
      return jsonResponse(snapshot);
    }

    if (req.method === 'POST' && action === 'cancel') {
      const snapshot = await cancelDeletion(admin, userId);
      return jsonResponse(snapshot);
    }

    throw httpError(404, 'NOT_FOUND', '接口不存在');
  } catch (error) {
    console.error('account-deletion error:', error);
    if (isHttpError(error)) {
      return jsonResponse({ code: error.code, message: error.message }, error.status);
    }
    return jsonResponse({ code: 'INTERNAL_ERROR', message: '系统繁忙，请稍后重试' }, 500);
  }
});

async function getSnapshot(admin: ReturnType<typeof createClient>, userId: string) {
  const [profile, request, hasActiveGroups] = await Promise.all([
    fetchProfile(admin, userId),
    fetchDeletionRequest(admin, userId),
    checkHasActiveGroups(admin, userId),
  ]);

  return buildSnapshot({ profile, request, hasActiveGroups });
}

async function applyDeletion(admin: ReturnType<typeof createClient>, userId: string) {
  const now = new Date();
  const [profile, request, hasActiveGroups] = await Promise.all([
    fetchProfile(admin, userId),
    fetchDeletionRequest(admin, userId),
    checkHasActiveGroups(admin, userId),
  ]);

  if (hasActiveGroups) {
    throw httpError(409, ERROR_MAP.ACTIVE_GROUPS.code, ERROR_MAP.ACTIVE_GROUPS.message);
  }

  const currentStatus = (request?.status ?? profile.deletion_status ?? STATUS.NOT_APPLIED) as ApplyStatus;
  if (![STATUS.NOT_APPLIED, STATUS.CANCELLED, STATUS.REJECTED].includes(currentStatus)) {
    throw httpError(409, ERROR_MAP.INVALID_APPLY_STATUS.code, ERROR_MAP.INVALID_APPLY_STATUS.message);
  }

  const coolingOffExpireAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
  const nextStatus = STATUS.COOLING_OFF;

  const payload = {
    user_id: userId,
    status: nextStatus,
    applied_at: now.toISOString(),
    cooling_off_expire_at: coolingOffExpireAt,
    forbidden_reason: null,
    result_reason: '',
    deleted_at: null,
  };

  let nextRequest: DeletionRequestRow | null = null;
  if (request) {
    const { data, error } = await admin
      .from('account_deletion_requests')
      .update(payload)
      .eq('user_id', userId)
      .select('id, user_id, status, cooling_off_expire_at, forbidden_reason, result_reason, updated_at')
      .single();
    if (error) throw error;
    nextRequest = data as DeletionRequestRow;
  } else {
    const { data, error } = await admin
      .from('account_deletion_requests')
      .insert(payload)
      .select('id, user_id, status, cooling_off_expire_at, forbidden_reason, result_reason, updated_at')
      .single();
    if (error) throw error;
    nextRequest = data as DeletionRequestRow;
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      deletion_status: nextStatus,
      deletion_requested_at: now.toISOString(),
      deletion_completed_at: null,
      deleted_at: null,
      can_create_group: false,
      can_join_group: false,
      updated_at: now.toISOString(),
    })
    .eq('id', userId);
  if (profileError) throw profileError;

  await Promise.all([
    createAuditLog(admin, userId, 'apply', {
      fromStatus: currentStatus,
      toStatus: nextStatus,
      coolingOffExpireAt,
    }),
    createNotification(admin, userId, '注销申请已提交', `账号已进入冷静期，可在 ${formatTime(coolingOffExpireAt)} 前撤销申请。`, '/settings'),
  ]);

  return buildSnapshot({
    profile: { ...profile, deletion_status: nextStatus, can_create_group: false, can_join_group: false },
    request: nextRequest,
    hasActiveGroups: false,
  });
}

async function cancelDeletion(admin: ReturnType<typeof createClient>, userId: string) {
  const now = new Date().toISOString();
  const [profile, request, hasActiveGroups] = await Promise.all([
    fetchProfile(admin, userId),
    fetchDeletionRequest(admin, userId),
    checkHasActiveGroups(admin, userId),
  ]);

  const currentStatus = (request?.status ?? profile.deletion_status ?? STATUS.NOT_APPLIED) as ApplyStatus;
  if (currentStatus !== STATUS.COOLING_OFF || !request) {
    throw httpError(409, ERROR_MAP.INVALID_CANCEL_STATUS.code, ERROR_MAP.INVALID_CANCEL_STATUS.message);
  }

  const { data: nextRequest, error: requestError } = await admin
    .from('account_deletion_requests')
    .update({
      status: STATUS.CANCELLED,
      result_reason: '用户已主动撤销注销申请',
      forbidden_reason: null,
    })
    .eq('user_id', userId)
    .select('id, user_id, status, cooling_off_expire_at, forbidden_reason, result_reason, updated_at')
    .single();
  if (requestError) throw requestError;

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      deletion_status: STATUS.CANCELLED,
      deletion_requested_at: null,
      can_create_group: true,
      can_join_group: true,
      updated_at: now,
    })
    .eq('id', userId);
  if (profileError) throw profileError;

  await Promise.all([
    createAuditLog(admin, userId, 'cancel', {
      fromStatus: currentStatus,
      toStatus: STATUS.CANCELLED,
    }),
    createNotification(admin, userId, '已撤销注销申请', '你的账号状态已恢复正常。', '/settings'),
  ]);

  return buildSnapshot({
    profile: { ...profile, deletion_status: STATUS.CANCELLED, can_create_group: true, can_join_group: true },
    request: nextRequest as DeletionRequestRow,
    hasActiveGroups,
  });
}

async function fetchProfile(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from('profiles')
    .select('id, nickname, can_create_group, can_join_group, deletion_status')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as ProfileRow;
}

async function fetchDeletionRequest(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from('account_deletion_requests')
    .select('id, user_id, status, cooling_off_expire_at, forbidden_reason, result_reason, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as DeletionRequestRow | null;
}

async function checkHasActiveGroups(admin: ReturnType<typeof createClient>, userId: string) {
  const activeStatuses = ['OPEN', 'FULL', 'IN_PROGRESS'];
  const [{ count: hostedCount, error: hostedError }, { count: memberCount, error: memberError }] = await Promise.all([
    admin.from('groups').select('id', { head: true, count: 'exact' }).eq('host_id', userId).in('status', activeStatuses),
    admin.from('group_members').select('id, groups!inner(status)', { head: true, count: 'exact' }).eq('user_id', userId).in('groups.status', activeStatuses),
  ]);
  if (hostedError) throw hostedError;
  if (memberError) throw memberError;
  return (hostedCount ?? 0) > 0 || (memberCount ?? 0) > 0;
}

function buildSnapshot({ profile, request, hasActiveGroups }: { profile: ProfileRow; request: DeletionRequestRow | null; hasActiveGroups: boolean; }) {
  const applyStatus = (request?.status ?? profile.deletion_status ?? STATUS.NOT_APPLIED) as ApplyStatus;
  const forbiddenReason = hasActiveGroups ? ERROR_MAP.ACTIVE_GROUPS.message : (request?.forbidden_reason ?? '');
  const canOperate = !hasActiveGroups && [STATUS.NOT_APPLIED, STATUS.CANCELLED, STATUS.REJECTED, STATUS.COOLING_OFF].includes(applyStatus);
  const availableActions: AvailableAction[] = applyStatus === STATUS.COOLING_OFF
    ? ['cancel']
    : (!hasActiveGroups && [STATUS.NOT_APPLIED, STATUS.CANCELLED, STATUS.REJECTED].includes(applyStatus) ? ['apply'] : []);

  return {
    applyStatus,
    coolingOffExpireAt: request?.cooling_off_expire_at ?? null,
    canOperate,
    forbiddenReason,
    resultReason: request?.result_reason ?? '',
    updatedAt: request?.updated_at ?? null,
    availableActions,
  };
}

async function createAuditLog(admin: ReturnType<typeof createClient>, userId: string, action: string, detail: Record<string, unknown>) {
  const { error } = await admin.from('account_deletion_audit_logs').insert({
    user_id: userId,
    operator_id: userId,
    action,
    detail,
  });
  if (error) throw error;
}

async function createNotification(admin: ReturnType<typeof createClient>, userId: string, title: string, content: string, linkTo: string) {
  const { error } = await admin.from('notifications').insert({
    user_id: userId,
    type: 'account_deletion',
    title,
    content,
    link_to: linkTo,
  });
  if (error) throw error;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function httpError(status: number, code: string, message: string) {
  return { status, code, message, __httpError: true as const };
}

function isHttpError(error: unknown): error is ReturnType<typeof httpError> {
  return typeof error === 'object' && error !== null && '__httpError' in error;
}
