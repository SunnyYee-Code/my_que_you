/**
 * T15 4.3.4 俱乐部 — 类型定义与工具函数
 */

// ─── 类型定义 ────────────────────────────────────────────────

export type ClubMemberRole = 'owner' | 'admin' | 'member';
export type ClubMemberStatus = 'active' | 'pending' | 'banned';

export interface Club {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  creatorId: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  /** 当前用户在该俱乐部的角色，未加入时为 null */
  myRole: ClubMemberRole | null;
  /** 当前用户的成员状态 */
  myStatus: ClubMemberStatus | null;
}

export interface ClubMember {
  id: string;
  clubId: string;
  userId: string;
  role: ClubMemberRole;
  status: ClubMemberStatus;
  joinedAt: string;
  profile: {
    nickname: string;
    avatarUrl: string | null;
    creditScore: number;
  };
}

export interface ClubAnnouncement {
  id: string;
  clubId: string;
  authorId: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: {
    nickname: string;
    avatarUrl: string | null;
  };
}

// ─── 常量 ────────────────────────────────────────────────────

export const CLUB_NAME_MAX_LEN = 30;
export const CLUB_NAME_MIN_LEN = 2;
export const CLUB_DESC_MAX_LEN = 200;
export const CLUB_ANNOUNCEMENT_MAX_LEN = 500;

// ─── 校验函数 ────────────────────────────────────────────────

export function validateClubName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < CLUB_NAME_MIN_LEN) return `俱乐部名称至少 ${CLUB_NAME_MIN_LEN} 个字符`;
  if (trimmed.length > CLUB_NAME_MAX_LEN) return `俱乐部名称不超过 ${CLUB_NAME_MAX_LEN} 个字符`;
  return null;
}

export function validateClubDescription(desc: string): string | null {
  if (desc.length > CLUB_DESC_MAX_LEN) return `简介不超过 ${CLUB_DESC_MAX_LEN} 个字符`;
  return null;
}

export function validateAnnouncementContent(content: string): string | null {
  const trimmed = content.trim();
  if (trimmed.length === 0) return '公告内容不能为空';
  if (trimmed.length > CLUB_ANNOUNCEMENT_MAX_LEN) return `公告不超过 ${CLUB_ANNOUNCEMENT_MAX_LEN} 个字符`;
  return null;
}

// ─── 辅助函数 ────────────────────────────────────────────────

/** 当前用户是否有管理权限（owner 或 admin） */
export function canManageClub(role: ClubMemberRole | null): boolean {
  return role === 'owner' || role === 'admin';
}

/** 当前用户是否是俱乐部成员（active 状态） */
export function isActiveMember(status: ClubMemberStatus | null): boolean {
  return status === 'active';
}

/** 字符数颜色辅助（用于输入框计数器显示） */
export function charCountColor(current: number, max: number): string {
  const ratio = current / max;
  if (ratio >= 0.9) return 'text-destructive';
  if (ratio >= 0.7) return 'text-yellow-500';
  return 'text-muted-foreground';
}

/** 成员角色中文标签 */
export function roleName(role: ClubMemberRole): string {
  const map: Record<ClubMemberRole, string> = {
    owner: '创始人',
    admin: '管理员',
    member: '成员',
  };
  return map[role];
}
