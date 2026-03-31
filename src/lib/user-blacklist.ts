export type UserBlacklistRelationship = 'none' | 'blocked_by_me' | 'blocked_by_them';

export interface UserBlacklistEntryLike {
  blocker_id: string;
  blocked_id: string;
}

export interface UserBlacklistState {
  isBlocked: boolean;
  relationship: UserBlacklistRelationship;
  blockedByUserId: string | null;
  reason: string;
}

const BLACKLIST_REASON_MAP: Record<Exclude<UserBlacklistRelationship, 'none'>, string> = {
  blocked_by_me: '你已将对方加入黑名单，当前无法继续互动',
  blocked_by_them: '由于对方的隐私设置，当前无法继续互动',
};

export function getUserBlacklistState(
  entries: UserBlacklistEntryLike[],
  currentUserId: string,
  targetUserId: string,
): UserBlacklistState {
  const blockedByMe = entries.find(
    (entry) => entry.blocker_id === currentUserId && entry.blocked_id === targetUserId,
  );
  if (blockedByMe) {
    return {
      isBlocked: true,
      relationship: 'blocked_by_me',
      blockedByUserId: currentUserId,
      reason: BLACKLIST_REASON_MAP.blocked_by_me,
    };
  }

  const blockedByThem = entries.find(
    (entry) => entry.blocker_id === targetUserId && entry.blocked_id === currentUserId,
  );
  if (blockedByThem) {
    return {
      isBlocked: true,
      relationship: 'blocked_by_them',
      blockedByUserId: targetUserId,
      reason: BLACKLIST_REASON_MAP.blocked_by_them,
    };
  }

  return {
    isBlocked: false,
    relationship: 'none',
    blockedByUserId: null,
    reason: '',
  };
}
