/**
 * T15 4.3.5 长期局 — 类型定义与工具函数
 */

// ─── 类型定义 ────────────────────────────────────────────────

export type RecurringGameStatus = 'active' | 'paused' | 'ended';
export type RecurringGameMemberRole = 'organizer' | 'member' | 'substitute';
export type RecurringGameMemberStatus = 'active' | 'pending' | 'on_leave';
export type RecurringGameSessionStatus = 'scheduled' | 'confirmed' | 'cancelled';

export interface RecurringGame {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  locationName: string | null;
  weekday: number; // 0=周日, 1=周一, ..., 6=周六
  startTime: string; // HH:MM
  maxMembers: number;
  memberCount: number;
  status: RecurringGameStatus;
  createdAt: string;
  updatedAt: string;
  /** 当前用户的角色，未加入时为 null */
  myRole: RecurringGameMemberRole | null;
  /** 当前用户的成员状态 */
  myStatus: RecurringGameMemberStatus | null;
}

export interface RecurringGameMember {
  id: string;
  gameId: string;
  userId: string;
  role: RecurringGameMemberRole;
  status: RecurringGameMemberStatus;
  joinedAt: string;
  profile: {
    nickname: string;
    avatarUrl: string | null;
    creditScore: number;
  };
}

export interface RecurringGameSession {
  id: string;
  gameId: string;
  sessionDate: string; // YYYY-MM-DD
  status: RecurringGameSessionStatus;
  notes: string | null;
  createdAt: string;
}

// ─── 常量 ────────────────────────────────────────────────────

export const RECURRING_GAME_TITLE_MAX = 50;
export const RECURRING_GAME_TITLE_MIN = 2;
export const RECURRING_GAME_DESC_MAX = 200;
export const RECURRING_GAME_SESSION_NOTES_MAX = 200;

export const WEEKDAY_LABELS: Record<number, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
};

export const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0].map(v => ({
  value: v,
  label: WEEKDAY_LABELS[v],
}));

export const STATUS_LABELS: Record<RecurringGameStatus, string> = {
  active: '进行中',
  paused: '暂停中',
  ended: '已结束',
};

export const MEMBER_ROLE_LABELS: Record<RecurringGameMemberRole, string> = {
  organizer: '组织者',
  member: '固定成员',
  substitute: '替补',
};

export const MEMBER_STATUS_LABELS: Record<RecurringGameMemberStatus, string> = {
  active: '在局',
  pending: '待确认',
  on_leave: '请假',
};

export const SESSION_STATUS_LABELS: Record<RecurringGameSessionStatus, string> = {
  scheduled: '待开局',
  confirmed: '已确认',
  cancelled: '已取消',
};

// ─── 校验函数 ────────────────────────────────────────────────

export function validateGameTitle(title: string): string | null {
  const trimmed = title.trim();
  if (trimmed.length < RECURRING_GAME_TITLE_MIN) return `局名至少 ${RECURRING_GAME_TITLE_MIN} 个字符`;
  if (trimmed.length > RECURRING_GAME_TITLE_MAX) return `局名不超过 ${RECURRING_GAME_TITLE_MAX} 个字符`;
  return null;
}

export function validateGameDescription(desc: string): string | null {
  if (desc.length > RECURRING_GAME_DESC_MAX) return `简介不超过 ${RECURRING_GAME_DESC_MAX} 个字符`;
  return null;
}

export function validateSessionNotes(notes: string): string | null {
  if (notes.trim().length === 0) return '备注不能为空';
  if (notes.length > RECURRING_GAME_SESSION_NOTES_MAX) return `备注不超过 ${RECURRING_GAME_SESSION_NOTES_MAX} 个字符`;
  return null;
}

export function validateStartTime(time: string): string | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return '时间格式不正确，请填写 HH:MM';
  const [h, m] = time.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return '时间超出范围';
  return null;
}

// ─── 辅助函数 ────────────────────────────────────────────────

/** 格式化星期+时间，如「每周五 19:00」 */
export function formatGameSchedule(weekday: number, startTime: string): string {
  return `每${WEEKDAY_LABELS[weekday] ?? '?'} ${startTime}`;
}

/** 当前用户是否是组织者 */
export function isOrganizer(role: RecurringGameMemberRole | null): boolean {
  return role === 'organizer';
}

/** 当前用户是否是活跃成员 */
export function isActiveMember(status: RecurringGameMemberStatus | null): boolean {
  return status === 'active';
}

/** 字符数颜色辅助 */
export function charCountColor(current: number, max: number): string {
  const ratio = current / max;
  if (ratio >= 0.9) return 'text-destructive';
  if (ratio >= 0.7) return 'text-yellow-500';
  return 'text-muted-foreground';
}

/** 判断是否还有名额 */
export function hasSlot(game: RecurringGame): boolean {
  return game.memberCount < game.maxMembers;
}
