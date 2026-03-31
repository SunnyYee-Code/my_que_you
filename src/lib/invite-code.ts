export type InviteBindingRecord = {
  inviteeId: string;
  inviteeNickname: string | null;
  boundAt: string;
};

export type BoundInviterSummary = {
  inviteCode: string;
  inviterId: string;
  inviterNickname: string | null;
  boundAt: string;
};

export type InviteCodeSnapshot = {
  inviteCode: string;
  canBind: boolean;
  invitedCount: number;
  invitedBy: BoundInviterSummary | null;
  recentInvites: InviteBindingRecord[];
};

export function normalizeInviteCode(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function validateInviteCode(input: string) {
  const normalized = normalizeInviteCode(input);

  if (!normalized) {
    return { ok: false as const, normalized, message: '请输入邀请码' };
  }

  if (normalized.length < 6 || normalized.length > 12) {
    return { ok: false as const, normalized, message: '邀请码需为 6-12 位字母或数字' };
  }

  return { ok: true as const, normalized };
}

export function createDefaultInviteCodeSnapshot(): InviteCodeSnapshot {
  return {
    inviteCode: '',
    canBind: true,
    invitedCount: 0,
    invitedBy: null,
    recentInvites: [],
  };
}

export function adaptInviteCodeSnapshot(payload: Record<string, unknown> | null | undefined): InviteCodeSnapshot {
  const invitedByPayload = payload?.invitedBy as Record<string, unknown> | null | undefined;
  const recentInvitesPayload = Array.isArray(payload?.recentInvites) ? payload?.recentInvites : [];

  return {
    inviteCode: normalizeInviteCode(String(payload?.inviteCode ?? '')),
    canBind: Boolean(payload?.canBind ?? true),
    invitedCount: Number(payload?.invitedCount ?? 0),
    invitedBy: invitedByPayload
      ? {
          inviteCode: normalizeInviteCode(String(invitedByPayload.inviteCode ?? '')),
          inviterId: String(invitedByPayload.inviterId ?? ''),
          inviterNickname: invitedByPayload.inviterNickname ? String(invitedByPayload.inviterNickname) : null,
          boundAt: String(invitedByPayload.boundAt ?? ''),
        }
      : null,
    recentInvites: recentInvitesPayload.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        inviteeId: String(row.inviteeId ?? ''),
        inviteeNickname: row.inviteeNickname ? String(row.inviteeNickname) : null,
        boundAt: String(row.boundAt ?? ''),
      };
    }),
  };
}
