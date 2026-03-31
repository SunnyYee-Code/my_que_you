import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

type AdminClient = ReturnType<typeof createClient>;

type ProfileSummary = {
  id: string;
  nickname: string | null;
  uid: string;
};

type InviteBindingRow = {
  inviter_id: string;
  invitee_id: string;
  invite_code: string;
  bound_at: string;
  inviter: { id: string; nickname: string | null; uid: string } | null;
  invitee: { id: string; nickname: string | null; uid: string } | null;
};

export function normalizeInviteCode(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function assertInviteCode(rawInput: string) {
  const inviteCode = normalizeInviteCode(rawInput);
  if (!inviteCode) {
    throw httpError(400, "INVITE_CODE_REQUIRED", "请输入邀请码");
  }
  if (inviteCode.length < 6 || inviteCode.length > 12) {
    throw httpError(400, "INVITE_CODE_INVALID", "邀请码需为 6-12 位字母或数字");
  }
  return inviteCode;
}

export async function getInviteCodeSnapshot(admin: AdminClient, userId: string) {
  const profile = await fetchProfile(admin, userId);
  const [binding, inviteCount, recentInvites] = await Promise.all([
    fetchInviteBinding(admin, userId),
    countInvites(admin, userId),
    fetchRecentInvites(admin, userId),
  ]);

  return {
    inviteCode: normalizeInviteCode(profile.uid),
    canBind: !binding,
    invitedCount: inviteCount,
    invitedBy: binding?.inviter
      ? {
          inviteCode: normalizeInviteCode(binding.invite_code),
          inviterId: binding.inviter.id,
          inviterNickname: binding.inviter.nickname,
          boundAt: binding.bound_at,
        }
      : null,
    recentInvites: recentInvites.map((item) => ({
      inviteeId: item.invitee?.id ?? item.invitee_id,
      inviteeNickname: item.invitee?.nickname ?? null,
      boundAt: item.bound_at,
    })),
  };
}

export async function bindInviteCodeForUser(admin: AdminClient, userId: string, rawInviteCode: string, bindSource = "settings") {
  const inviteCode = assertInviteCode(rawInviteCode);
  const [profile, existingBinding] = await Promise.all([
    fetchProfile(admin, userId),
    fetchInviteBinding(admin, userId),
  ]);

  if (existingBinding) {
    throw httpError(409, "INVITE_CODE_ALREADY_BOUND", "当前账号已绑定邀请码");
  }

  const inviter = await fetchProfileByInviteCode(admin, inviteCode);
  if (!inviter) {
    throw httpError(404, "INVITE_CODE_NOT_FOUND", "邀请码不存在");
  }
  if (inviter.id === userId) {
    throw httpError(409, "INVITE_CODE_SELF_BIND", "不能绑定自己的邀请码");
  }

  const { error: insertError } = await admin
    .from("user_invite_bindings")
    .insert({
      inviter_id: inviter.id,
      invitee_id: userId,
      invite_code: inviteCode,
      bind_source: bindSource,
      status: "bound",
    });
  if (insertError) throw insertError;

  const inviteeDisplayName = profile.nickname || "新注册用户";
  await admin.from("notifications").insert([
    {
      user_id: inviter.id,
      type: "application_update",
      title: "你的邀请码被使用",
      content: `${inviteeDisplayName} 已绑定你的邀请码 ${inviteCode}`,
      link_to: "/settings",
    },
    {
      user_id: userId,
      type: "application_update",
      title: "邀请码绑定成功",
      content: `已记录你与 ${inviter.nickname || "邀请人"} 的邀请关系`,
      link_to: "/settings",
    },
  ]);

  return getInviteCodeSnapshot(admin, userId);
}

async function fetchProfile(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, nickname, uid")
    .eq("id", userId)
    .single();
  if (error || !data) throw httpError(404, "PROFILE_NOT_FOUND", "用户资料不存在");
  return data as ProfileSummary;
}

async function fetchProfileByInviteCode(admin: AdminClient, inviteCode: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, nickname, uid")
    .eq("uid", inviteCode)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileSummary | null) ?? null;
}

async function fetchInviteBinding(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("user_invite_bindings")
    .select(`
      inviter_id,
      invitee_id,
      invite_code,
      bound_at,
      inviter:profiles!user_invite_bindings_inviter_id_fkey(id, nickname, uid),
      invitee:profiles!user_invite_bindings_invitee_id_fkey(id, nickname, uid)
    `)
    .eq("invitee_id", userId)
    .eq("status", "bound")
    .maybeSingle();
  if (error) throw error;
  return (data as InviteBindingRow | null) ?? null;
}

async function countInvites(admin: AdminClient, userId: string) {
  const { count, error } = await admin
    .from("user_invite_bindings")
    .select("id", { count: "exact", head: true })
    .eq("inviter_id", userId)
    .eq("status", "bound");
  if (error) throw error;
  return count ?? 0;
}

async function fetchRecentInvites(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("user_invite_bindings")
    .select(`
      inviter_id,
      invitee_id,
      invite_code,
      bound_at,
      inviter:profiles!user_invite_bindings_inviter_id_fkey(id, nickname, uid),
      invitee:profiles!user_invite_bindings_invitee_id_fkey(id, nickname, uid)
    `)
    .eq("inviter_id", userId)
    .eq("status", "bound")
    .order("bound_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data as InviteBindingRow[] | null) ?? [];
}

type HttpError = Error & { status: number; code: string };

export function httpError(status: number, code: string, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  error.code = code;
  return error;
}

export function isHttpError(error: unknown): error is HttpError {
  return Boolean(error && typeof error === "object" && "status" in error && "code" in error);
}
