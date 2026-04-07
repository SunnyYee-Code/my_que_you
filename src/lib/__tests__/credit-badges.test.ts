import { describe, expect, it } from 'vitest';
import {
  computeFulfillmentBadge,
  computeActivityBadge,
  computeReputationBadge,
  computeCreditBadge,
  computeAllBadges,
  type BadgeInput,
} from '@/lib/credit-badges';

const emptyInput: BadgeInput = {
  creditScore: 100,
  fulfillmentRecords: [],
  groupMemberships: [],
  reviews: [],
};

// 辅助：生成近90天内的 joined_at
function recentDate(daysAgo = 10): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

// 辅助：生成90天以外的 joined_at
function oldDate(): string {
  return new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
}

// ─── 履约达人 ───────────────────────────────────────────────

describe('computeFulfillmentBadge', () => {
  it('有效记录不足5条时返回 null', () => {
    const input: BadgeInput = {
      ...emptyInput,
      fulfillmentRecords: [
        { status: 'fulfilled' },
        { status: 'fulfilled' },
        { status: 'fulfilled' },
      ],
    };
    expect(computeFulfillmentBadge(input)).toBeNull();
  });

  it('cancelled 记录不计入统计', () => {
    // 3 fulfilled + 4 cancelled = 3条有效，不足5条
    const input: BadgeInput = {
      ...emptyInput,
      fulfillmentRecords: [
        { status: 'fulfilled' },
        { status: 'fulfilled' },
        { status: 'fulfilled' },
        { status: 'cancelled' },
        { status: 'cancelled' },
        { status: 'cancelled' },
        { status: 'cancelled' },
      ],
    };
    expect(computeFulfillmentBadge(input)).toBeNull();
  });

  it('5场fulfilled + 1场no_show → 铜牌（83%≥80%）', () => {
    const records = [
      ...Array(5).fill({ status: 'fulfilled' as const }),
      { status: 'no_show' as const },
    ];
    const result = computeFulfillmentBadge({ ...emptyInput, fulfillmentRecords: records });
    expect(result?.level).toBe('bronze');
    expect(result?.type).toBe('fulfillment');
  });

  it('15场fulfilled + 1场no_show → 银牌（94%≥90%）', () => {
    const records = [
      ...Array(15).fill({ status: 'fulfilled' as const }),
      { status: 'no_show' as const },
    ];
    const result = computeFulfillmentBadge({ ...emptyInput, fulfillmentRecords: records });
    expect(result?.level).toBe('silver');
  });

  it('30场fulfilled + 1场left_early → 金牌（97%≥95%）', () => {
    const records = [
      ...Array(30).fill({ status: 'fulfilled' as const }),
      { status: 'left_early' as const },
    ];
    const result = computeFulfillmentBadge({ ...emptyInput, fulfillmentRecords: records });
    expect(result?.level).toBe('gold');
  });

  it('高次数但低履约率不获得勋章', () => {
    // 10 fulfilled, 10 no_show → 50% < 80%
    const records = [
      ...Array(10).fill({ status: 'fulfilled' as const }),
      ...Array(10).fill({ status: 'no_show' as const }),
    ];
    const result = computeFulfillmentBadge({ ...emptyInput, fulfillmentRecords: records });
    expect(result).toBeNull();
  });

  it('只返回最高等级，不同时返回多个等级', () => {
    // 30场履约 + 1场no_show → 金牌，不返回银牌或铜牌
    const records = [
      ...Array(30).fill({ status: 'fulfilled' as const }),
      { status: 'no_show' as const },
    ];
    const result = computeFulfillmentBadge({ ...emptyInput, fulfillmentRecords: records });
    expect(result?.level).toBe('gold');
  });
});

// ─── 活跃牌友 ───────────────────────────────────────────────

describe('computeActivityBadge', () => {
  it('近90天参团数为0时返回 null', () => {
    expect(computeActivityBadge(emptyInput)).toBeNull();
  });

  it('90天外的记录不计入统计', () => {
    const input: BadgeInput = {
      ...emptyInput,
      groupMemberships: Array(10).fill({ joined_at: oldDate() }),
    };
    expect(computeActivityBadge(input)).toBeNull();
  });

  it('近90天≥5场 → 铜牌', () => {
    const input: BadgeInput = {
      ...emptyInput,
      groupMemberships: Array(5).fill({ joined_at: recentDate() }),
    };
    expect(computeActivityBadge(input)?.level).toBe('bronze');
  });

  it('近90天≥15场 → 银牌', () => {
    const input: BadgeInput = {
      ...emptyInput,
      groupMemberships: Array(15).fill({ joined_at: recentDate() }),
    };
    expect(computeActivityBadge(input)?.level).toBe('silver');
  });

  it('近90天≥30场 → 金牌', () => {
    const input: BadgeInput = {
      ...emptyInput,
      groupMemberships: Array(30).fill({ joined_at: recentDate() }),
    };
    expect(computeActivityBadge(input)?.level).toBe('gold');
  });

  it('混合新旧记录只统计近90天', () => {
    // 4条近90天 + 20条旧记录 → 不足5条，返回 null
    const input: BadgeInput = {
      ...emptyInput,
      groupMemberships: [
        ...Array(4).fill({ joined_at: recentDate() }),
        ...Array(20).fill({ joined_at: oldDate() }),
      ],
    };
    expect(computeActivityBadge(input)).toBeNull();
  });
});

// ─── 口碑之星 ───────────────────────────────────────────────

describe('computeReputationBadge', () => {
  it('评价数不足5条时返回 null', () => {
    const reviews = Array(4).fill({ attitude: 5, punctuality: 5, skill: 5 });
    expect(computeReputationBadge({ ...emptyInput, reviews })).toBeNull();
  });

  it('评价数足够但均分不达标返回 null', () => {
    // 5条评价，均分 3.0 < 4.0
    const reviews = Array(5).fill({ attitude: 3, punctuality: 3, skill: 3 });
    expect(computeReputationBadge({ ...emptyInput, reviews })).toBeNull();
  });

  it('5条评价均分≥4.0 → 铜牌', () => {
    const reviews = Array(5).fill({ attitude: 4, punctuality: 4, skill: 4 });
    expect(computeReputationBadge({ ...emptyInput, reviews })?.level).toBe('bronze');
  });

  it('10条评价均分≥4.3 → 银牌', () => {
    const reviews = Array(10).fill({ attitude: 5, punctuality: 4, skill: 4 }); // avg = 4.33
    expect(computeReputationBadge({ ...emptyInput, reviews })?.level).toBe('silver');
  });

  it('20条评价均分≥4.6 → 金牌', () => {
    const reviews = Array(20).fill({ attitude: 5, punctuality: 5, skill: 4 }); // avg = 4.67
    expect(computeReputationBadge({ ...emptyInput, reviews })?.level).toBe('gold');
  });

  it('3条完美评价不获得勋章（数量不足）', () => {
    const reviews = Array(3).fill({ attitude: 5, punctuality: 5, skill: 5 });
    expect(computeReputationBadge({ ...emptyInput, reviews })).toBeNull();
  });
});

// ─── 信用典范 ───────────────────────────────────────────────

describe('computeCreditBadge', () => {
  it('信用分<85 返回 null', () => {
    expect(computeCreditBadge({ ...emptyInput, creditScore: 84 })).toBeNull();
  });

  it('信用分=85 → 铜牌', () => {
    expect(computeCreditBadge({ ...emptyInput, creditScore: 85 })?.level).toBe('bronze');
  });

  it('信用分=90 → 银牌', () => {
    expect(computeCreditBadge({ ...emptyInput, creditScore: 90 })?.level).toBe('silver');
  });

  it('信用分=95 → 金牌', () => {
    expect(computeCreditBadge({ ...emptyInput, creditScore: 95 })?.level).toBe('gold');
  });

  it('信用分=100 → 金牌', () => {
    expect(computeCreditBadge({ ...emptyInput, creditScore: 100 })?.level).toBe('gold');
  });
});

// ─── computeAllBadges ───────────────────────────────────────

describe('computeAllBadges', () => {
  it('空数据新用户返回空数组', () => {
    expect(computeAllBadges({ ...emptyInput, creditScore: 70 })).toEqual([]);
  });

  it('满足所有条件返回4枚勋章', () => {
    const input: BadgeInput = {
      creditScore: 95,
      fulfillmentRecords: Array(30).fill({ status: 'fulfilled' as const }),
      groupMemberships: Array(30).fill({ joined_at: recentDate() }),
      reviews: Array(20).fill({ attitude: 5, punctuality: 5, skill: 4 }),
    };
    const badges = computeAllBadges(input);
    expect(badges).toHaveLength(4);
    expect(badges.map(b => b.type).sort()).toEqual(
      ['activity', 'credit', 'fulfillment', 'reputation'],
    );
  });

  it('每种类型只返回最高等级', () => {
    const input: BadgeInput = {
      creditScore: 95,
      fulfillmentRecords: Array(30).fill({ status: 'fulfilled' as const }),
      groupMemberships: Array(30).fill({ joined_at: recentDate() }),
      reviews: Array(20).fill({ attitude: 5, punctuality: 5, skill: 4 }),
    };
    const badges = computeAllBadges(input);
    // 每种类型只有一个
    const types = badges.map(b => b.type);
    expect(new Set(types).size).toBe(types.length);
    // 全部为金牌
    expect(badges.every(b => b.level === 'gold')).toBe(true);
  });

  it('isActive 全部为 true', () => {
    const input: BadgeInput = {
      creditScore: 90,
      fulfillmentRecords: [],
      groupMemberships: [],
      reviews: [],
    };
    const badges = computeAllBadges(input);
    expect(badges.every(b => b.isActive)).toBe(true);
  });
});
