import { describe, expect, it } from 'vitest';
import {
  RECURRING_GAME_TITLE_MAX,
  RECURRING_GAME_TITLE_MIN,
  RECURRING_GAME_DESC_MAX,
  RECURRING_GAME_SESSION_NOTES_MAX,
  WEEKDAY_LABELS,
  WEEKDAY_OPTIONS,
  STATUS_LABELS,
  MEMBER_ROLE_LABELS,
  MEMBER_STATUS_LABELS,
  SESSION_STATUS_LABELS,
  validateGameTitle,
  validateGameDescription,
  validateSessionNotes,
  validateStartTime,
  formatGameSchedule,
  isOrganizer,
  isActiveMember,
  charCountColor,
  hasSlot,
  type RecurringGame,
} from '@/lib/recurring-games';

// ─── validateGameTitle ───────────────────────────────────────

describe('validateGameTitle', () => {
  it('空字符串返回错误', () => {
    expect(validateGameTitle('')).toBeTruthy();
  });

  it('1 个字符返回错误', () => {
    expect(validateGameTitle('a')).toBeTruthy();
  });

  it('2 个字符通过', () => {
    expect(validateGameTitle('周五')).toBeNull();
  });

  it('正常标题通过', () => {
    expect(validateGameTitle('周五晚固定麻将局')).toBeNull();
  });

  it(`恰好 ${RECURRING_GAME_TITLE_MAX} 个字符通过`, () => {
    expect(validateGameTitle('a'.repeat(RECURRING_GAME_TITLE_MAX))).toBeNull();
  });

  it(`超过 ${RECURRING_GAME_TITLE_MAX} 个字符返回错误`, () => {
    const err = validateGameTitle('a'.repeat(RECURRING_GAME_TITLE_MAX + 1));
    expect(err).toBeTruthy();
    expect(err).toContain(String(RECURRING_GAME_TITLE_MAX));
  });

  it('纯空白字符串返回错误（trim 后过短）', () => {
    expect(validateGameTitle('   ')).toBeTruthy();
  });
});

// ─── validateGameDescription ─────────────────────────────────

describe('validateGameDescription', () => {
  it('空字符串通过（可选字段）', () => {
    expect(validateGameDescription('')).toBeNull();
  });

  it('正常内容通过', () => {
    expect(validateGameDescription('每周五晚 19 点，广东麻将')).toBeNull();
  });

  it(`恰好 ${RECURRING_GAME_DESC_MAX} 个字符通过`, () => {
    expect(validateGameDescription('a'.repeat(RECURRING_GAME_DESC_MAX))).toBeNull();
  });

  it(`超过 ${RECURRING_GAME_DESC_MAX} 个字符返回错误`, () => {
    const err = validateGameDescription('a'.repeat(RECURRING_GAME_DESC_MAX + 1));
    expect(err).toBeTruthy();
    expect(err).toContain(String(RECURRING_GAME_DESC_MAX));
  });
});

// ─── validateSessionNotes ────────────────────────────────────

describe('validateSessionNotes', () => {
  it('空字符串返回错误', () => {
    expect(validateSessionNotes('')).toBeTruthy();
  });

  it('纯空白返回错误', () => {
    expect(validateSessionNotes('   ')).toBeTruthy();
  });

  it('正常内容通过', () => {
    expect(validateSessionNotes('今晚 4 人到场，广东赛')).toBeNull();
  });

  it(`超过 ${RECURRING_GAME_SESSION_NOTES_MAX} 个字符返回错误`, () => {
    const err = validateSessionNotes('a'.repeat(RECURRING_GAME_SESSION_NOTES_MAX + 1));
    expect(err).toBeTruthy();
  });
});

// ─── validateStartTime ───────────────────────────────────────

describe('validateStartTime', () => {
  it('空字符串返回错误', () => {
    expect(validateStartTime('')).toBeTruthy();
  });

  it('格式不对返回错误', () => {
    expect(validateStartTime('7pm')).toBeTruthy();
    expect(validateStartTime('7:00pm')).toBeTruthy();
    expect(validateStartTime('25:00')).toBeTruthy();
  });

  it('合法时间通过', () => {
    expect(validateStartTime('19:00')).toBeNull();
    expect(validateStartTime('00:00')).toBeNull();
    expect(validateStartTime('23:59')).toBeNull();
  });

  it('分钟超范围返回错误', () => {
    expect(validateStartTime('10:60')).toBeTruthy();
  });
});

// ─── formatGameSchedule ──────────────────────────────────────

describe('formatGameSchedule', () => {
  it('正确格式化 weekday=5 + 19:00', () => {
    expect(formatGameSchedule(5, '19:00')).toBe('每周五 19:00');
  });

  it('周日（0）格式化', () => {
    expect(formatGameSchedule(0, '10:30')).toBe('每周日 10:30');
  });

  it('周一格式化', () => {
    expect(formatGameSchedule(1, '20:00')).toBe('每周一 20:00');
  });
});

// ─── isOrganizer ─────────────────────────────────────────────

describe('isOrganizer', () => {
  it('organizer 返回 true', () => {
    expect(isOrganizer('organizer')).toBe(true);
  });

  it('member 返回 false', () => {
    expect(isOrganizer('member')).toBe(false);
  });

  it('substitute 返回 false', () => {
    expect(isOrganizer('substitute')).toBe(false);
  });

  it('null 返回 false', () => {
    expect(isOrganizer(null)).toBe(false);
  });
});

// ─── isActiveMember ──────────────────────────────────────────

describe('isActiveMember', () => {
  it('active 返回 true', () => {
    expect(isActiveMember('active')).toBe(true);
  });

  it('pending 返回 false', () => {
    expect(isActiveMember('pending')).toBe(false);
  });

  it('on_leave 返回 false', () => {
    expect(isActiveMember('on_leave')).toBe(false);
  });

  it('null 返回 false', () => {
    expect(isActiveMember(null)).toBe(false);
  });
});

// ─── charCountColor ──────────────────────────────────────────

describe('charCountColor', () => {
  it('低于 70% 返回 muted 类', () => {
    expect(charCountColor(0, 100)).toContain('muted');
  });

  it('70%-89% 返回黄色类', () => {
    expect(charCountColor(75, 100)).toContain('yellow');
  });

  it('≥90% 返回 destructive 类', () => {
    expect(charCountColor(95, 100)).toContain('destructive');
  });
});

// ─── hasSlot ─────────────────────────────────────────────────

describe('hasSlot', () => {
  const makeGame = (memberCount: number, maxMembers: number): RecurringGame => ({
    id: 'test',
    creatorId: 'u1',
    title: '测试局',
    description: null,
    locationName: null,
    weekday: 5,
    startTime: '19:00',
    maxMembers,
    memberCount,
    status: 'active',
    createdAt: '',
    updatedAt: '',
    myRole: null,
    myStatus: null,
  });

  it('有空位时返回 true', () => {
    expect(hasSlot(makeGame(3, 4))).toBe(true);
  });

  it('满员时返回 false', () => {
    expect(hasSlot(makeGame(4, 4))).toBe(false);
  });

  it('超出（异常数据）返回 false', () => {
    expect(hasSlot(makeGame(5, 4))).toBe(false);
  });
});

// ─── 常量完整性 ──────────────────────────────────────────────

describe('常量完整性', () => {
  it('WEEKDAY_LABELS 包含 0-6 七个星期', () => {
    expect(Object.keys(WEEKDAY_LABELS).map(Number)).toEqual(
      expect.arrayContaining([0, 1, 2, 3, 4, 5, 6])
    );
  });

  it('WEEKDAY_OPTIONS 共 7 条', () => {
    expect(WEEKDAY_OPTIONS).toHaveLength(7);
  });

  it('STATUS_LABELS 包含三种状态', () => {
    expect(STATUS_LABELS['active']).toBeTruthy();
    expect(STATUS_LABELS['paused']).toBeTruthy();
    expect(STATUS_LABELS['ended']).toBeTruthy();
  });

  it('MEMBER_ROLE_LABELS 包含三种角色', () => {
    expect(MEMBER_ROLE_LABELS['organizer']).toBeTruthy();
    expect(MEMBER_ROLE_LABELS['member']).toBeTruthy();
    expect(MEMBER_ROLE_LABELS['substitute']).toBeTruthy();
  });

  it('MEMBER_STATUS_LABELS 包含三种状态', () => {
    expect(MEMBER_STATUS_LABELS['active']).toBeTruthy();
    expect(MEMBER_STATUS_LABELS['pending']).toBeTruthy();
    expect(MEMBER_STATUS_LABELS['on_leave']).toBeTruthy();
  });

  it('SESSION_STATUS_LABELS 包含三种状态', () => {
    expect(SESSION_STATUS_LABELS['scheduled']).toBeTruthy();
    expect(SESSION_STATUS_LABELS['confirmed']).toBeTruthy();
    expect(SESSION_STATUS_LABELS['cancelled']).toBeTruthy();
  });
});
