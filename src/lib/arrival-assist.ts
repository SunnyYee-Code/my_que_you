// T16 4.4.2 到场辅助链路工具函数

// ── 场地补充说明 ──────────────────────────────────────────────────────────────

export interface VenueHint {
  /** 入口说明，如"南门进，走左侧电梯" */
  entrance?: string;
  /** 楼层说明，如"3楼 301 室" */
  floor?: string;
  /** 联系人提示，如"到了联系微信：xxx" */
  contact?: string;
  /** 其他备注 */
  notes?: string;
}

export function parseVenueHint(raw: unknown): VenueHint | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const hint: VenueHint = {};
  if (typeof r.entrance === 'string' && r.entrance.trim()) hint.entrance = r.entrance.trim();
  if (typeof r.floor === 'string' && r.floor.trim()) hint.floor = r.floor.trim();
  if (typeof r.contact === 'string' && r.contact.trim()) hint.contact = r.contact.trim();
  if (typeof r.notes === 'string' && r.notes.trim()) hint.notes = r.notes.trim();
  if (!hint.entrance && !hint.floor && !hint.contact && !hint.notes) return null;
  return hint;
}

export function hasVenueHint(hint: VenueHint | null | undefined): boolean {
  if (!hint) return false;
  return !!(hint.entrance || hint.floor || hint.contact || hint.notes);
}

/** 字段最大字符数限制 */
export const VENUE_HINT_MAX = 60;

export interface VenueHintValidationError {
  field: keyof VenueHint;
  message: string;
}

export function validateVenueHint(hint: VenueHint): VenueHintValidationError | null {
  const fields: (keyof VenueHint)[] = ['entrance', 'floor', 'contact', 'notes'];
  for (const field of fields) {
    const val = hint[field];
    if (val && val.length > VENUE_HINT_MAX) {
      return { field, message: `${field} 最多 ${VENUE_HINT_MAX} 个字符` };
    }
  }
  return null;
}

// ── 快捷协同消息 ──────────────────────────────────────────────────────────────

export interface QuickMessage {
  id: string;
  label: string;
  /** 发送到聊天的实际内容 */
  content: string;
  /** 是否仅房主可见 */
  hostOnly?: boolean;
  /** 是否仅成员可见（非房主） */
  memberOnly?: boolean;
}

/** 房主快捷消息 */
export const HOST_QUICK_MESSAGES: QuickMessage[] = [
  { id: 'host_ready', label: '已开桌', content: '🀄 牌桌已开好，欢迎到场！', hostOnly: true },
  { id: 'host_urge', label: '请准时', content: '⏰ 快开局了，请大家尽快到场～', hostOnly: true },
  { id: 'host_location_change', label: '地址有变', content: '📍 集合地点有变更，请查看最新位置消息', hostOnly: true },
  { id: 'host_wait', label: '等候中', content: '🪑 我已经在场内等候了，请按之前位置来', hostOnly: true },
];

/** 成员快捷消息 */
export const MEMBER_QUICK_MESSAGES: QuickMessage[] = [
  { id: 'mem_otw', label: '在路上', content: '🚶 我在路上，马上到！', memberOnly: true },
  { id: 'mem_arrived', label: '已到场', content: '✅ 我已经到了', memberOnly: true },
  { id: 'mem_lost', label: '找不到', content: '🔍 我到楼下了，找不到入口，有人来接一下吗？', memberOnly: true },
  { id: 'mem_late', label: '会迟到', content: '⚠️ 我会迟到大概 10 分钟，请稍等', memberOnly: true },
];

/** 通用异常兜底快捷消息（房主和成员都可发） */
export const COMMON_QUICK_MESSAGES: QuickMessage[] = [
  { id: 'common_no_contact', label: '联系不上', content: '📵 联系不上，请回复消息或打电话' },
  { id: 'common_start_soon', label: '快开始了', content: '⏱️ 快要开始了，有情况请提前说' },
];

/**
 * 根据用户是否为房主，获取适合展示的快捷消息列表
 */
export function getQuickMessages(isHost: boolean): QuickMessage[] {
  if (isHost) {
    return [...HOST_QUICK_MESSAGES, ...COMMON_QUICK_MESSAGES];
  }
  return [...MEMBER_QUICK_MESSAGES, ...COMMON_QUICK_MESSAGES];
}
