/**
 * 信用勋章系统 - 核心逻辑
 *
 * 勋章类型：
 * - 履约达人：基于履约记录的完成率和次数
 * - 活跃牌友：基于近90天参团记录
 * - 口碑之星：基于收到的评价评分
 * - 信用典范：基于信用分
 *
 * 勋章等级：铜牌 / 银牌 / 金牌
 * 有效期策略：实时计算，数据回落即失效（无需手动回收）
 */

export type BadgeType = 'fulfillment' | 'activity' | 'reputation' | 'credit';
export type BadgeLevel = 'bronze' | 'silver' | 'gold';

export type BadgeId =
  | 'fulfillment_bronze' | 'fulfillment_silver' | 'fulfillment_gold'
  | 'activity_bronze'    | 'activity_silver'    | 'activity_gold'
  | 'reputation_bronze'  | 'reputation_silver'  | 'reputation_gold'
  | 'credit_bronze'      | 'credit_silver'      | 'credit_gold';

export type Badge = {
  id: BadgeId;
  type: BadgeType;
  level: BadgeLevel;
  /** 带等级的完整标签，如"履约达人·金" */
  label: string;
  /** 短标签，用于紧凑展示，如"履约达人" */
  shortLabel: string;
  /** 可解释的获取条件，展示给用户 */
  description: string;
  /** 图标 emoji */
  icon: string;
  /** Tailwind 颜色类（bg + text） */
  colorClass: string;
};

export type EarnedBadge = Badge & {
  /** 实时计算，无持久化时间戳 */
  earnedAt: null;
  isActive: boolean;
};

/** 勋章定义目录 */
export const BADGE_CATALOGUE: Record<BadgeId, Badge> = {
  fulfillment_bronze: {
    id: 'fulfillment_bronze', type: 'fulfillment', level: 'bronze',
    label: '履约达人·铜', shortLabel: '履约达人',
    description: '完成5场以上，履约率≥80%',
    icon: '🤝', colorClass: 'bg-amber-700/15 text-amber-700',
  },
  fulfillment_silver: {
    id: 'fulfillment_silver', type: 'fulfillment', level: 'silver',
    label: '履约达人·银', shortLabel: '履约达人',
    description: '完成15场以上，履约率≥90%',
    icon: '🤝', colorClass: 'bg-slate-400/20 text-slate-600',
  },
  fulfillment_gold: {
    id: 'fulfillment_gold', type: 'fulfillment', level: 'gold',
    label: '履约达人·金', shortLabel: '履约达人',
    description: '完成30场以上，履约率≥95%',
    icon: '🤝', colorClass: 'bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]',
  },
  activity_bronze: {
    id: 'activity_bronze', type: 'activity', level: 'bronze',
    label: '活跃牌友·铜', shortLabel: '活跃牌友',
    description: '近90天参团≥5场',
    icon: '🀄', colorClass: 'bg-primary/10 text-primary',
  },
  activity_silver: {
    id: 'activity_silver', type: 'activity', level: 'silver',
    label: '活跃牌友·银', shortLabel: '活跃牌友',
    description: '近90天参团≥15场',
    icon: '🀄', colorClass: 'bg-slate-400/20 text-slate-600',
  },
  activity_gold: {
    id: 'activity_gold', type: 'activity', level: 'gold',
    label: '活跃牌友·金', shortLabel: '活跃牌友',
    description: '近90天参团≥30场',
    icon: '🀄', colorClass: 'bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]',
  },
  reputation_bronze: {
    id: 'reputation_bronze', type: 'reputation', level: 'bronze',
    label: '口碑之星·铜', shortLabel: '口碑之星',
    description: '收到≥5条评价，综合评分≥4.0',
    icon: '⭐', colorClass: 'bg-orange-500/10 text-orange-600',
  },
  reputation_silver: {
    id: 'reputation_silver', type: 'reputation', level: 'silver',
    label: '口碑之星·银', shortLabel: '口碑之星',
    description: '收到≥10条评价，综合评分≥4.3',
    icon: '⭐', colorClass: 'bg-slate-400/20 text-slate-600',
  },
  reputation_gold: {
    id: 'reputation_gold', type: 'reputation', level: 'gold',
    label: '口碑之星·金', shortLabel: '口碑之星',
    description: '收到≥20条评价，综合评分≥4.6',
    icon: '⭐', colorClass: 'bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]',
  },
  credit_bronze: {
    id: 'credit_bronze', type: 'credit', level: 'bronze',
    label: '信用典范·铜', shortLabel: '信用典范',
    description: '信用分≥85',
    icon: '🛡️', colorClass: 'bg-success/10 text-success',
  },
  credit_silver: {
    id: 'credit_silver', type: 'credit', level: 'silver',
    label: '信用典范·银', shortLabel: '信用典范',
    description: '信用分≥90',
    icon: '🛡️', colorClass: 'bg-slate-400/20 text-slate-600',
  },
  credit_gold: {
    id: 'credit_gold', type: 'credit', level: 'gold',
    label: '信用典范·金', shortLabel: '信用典范',
    description: '信用分≥95',
    icon: '🛡️', colorClass: 'bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]',
  },
};

/** 计算勋章所需的输入数据 */
export type BadgeInput = {
  creditScore: number;
  /** 履约记录，cancelled 状态不计入统计 */
  fulfillmentRecords: Array<{
    status: 'fulfilled' | 'no_show' | 'left_early' | 'cancelled';
  }>;
  /** 所有参团记录（含 joined_at，用于计算近90天活跃度） */
  groupMemberships: Array<{
    joined_at: string;
  }>;
  /** 收到的所有评价 */
  reviews: Array<{
    attitude: number;
    punctuality: number;
    skill: number;
  }>;
};

function makeEarnedBadge(id: BadgeId): EarnedBadge {
  return { ...BADGE_CATALOGUE[id], earnedAt: null, isActive: true };
}

/**
 * 计算履约达人勋章（最高等级）
 * - cancelled 状态不计入统计（主动取消不算失约）
 * - 至少5条有效记录才评估
 */
export function computeFulfillmentBadge(input: BadgeInput): EarnedBadge | null {
  const tracked = input.fulfillmentRecords.filter(r => r.status !== 'cancelled');
  const total = tracked.length;
  if (total < 5) return null;

  const fulfilled = tracked.filter(r => r.status === 'fulfilled').length;
  const rate = (fulfilled / total) * 100;

  if (fulfilled >= 30 && rate >= 95) return makeEarnedBadge('fulfillment_gold');
  if (fulfilled >= 15 && rate >= 90) return makeEarnedBadge('fulfillment_silver');
  if (fulfilled >= 5 && rate >= 80) return makeEarnedBadge('fulfillment_bronze');
  return null;
}

/**
 * 计算活跃牌友勋章（最高等级）
 * - 仅统计近90天内的参团记录
 */
export function computeActivityBadge(input: BadgeInput): EarnedBadge | null {
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const recentCount = input.groupMemberships.filter(m => {
    return new Date(m.joined_at).getTime() >= ninetyDaysAgo;
  }).length;

  if (recentCount >= 30) return makeEarnedBadge('activity_gold');
  if (recentCount >= 15) return makeEarnedBadge('activity_silver');
  if (recentCount >= 5) return makeEarnedBadge('activity_bronze');
  return null;
}

/**
 * 计算口碑之星勋章（最高等级）
 * - 每条评价取 (attitude + punctuality + skill) / 3 的平均分
 * - 至少5条评价才评估
 */
export function computeReputationBadge(input: BadgeInput): EarnedBadge | null {
  const count = input.reviews.length;
  if (count < 5) return null;

  const avgScore =
    input.reviews.reduce((sum, r) => sum + (r.attitude + r.punctuality + r.skill) / 3, 0) / count;

  if (count >= 20 && avgScore >= 4.6) return makeEarnedBadge('reputation_gold');
  if (count >= 10 && avgScore >= 4.3) return makeEarnedBadge('reputation_silver');
  if (count >= 5 && avgScore >= 4.0) return makeEarnedBadge('reputation_bronze');
  return null;
}

/**
 * 计算信用典范勋章（最高等级）
 */
export function computeCreditBadge(input: BadgeInput): EarnedBadge | null {
  const score = input.creditScore;
  if (score >= 95) return makeEarnedBadge('credit_gold');
  if (score >= 90) return makeEarnedBadge('credit_silver');
  if (score >= 85) return makeEarnedBadge('credit_bronze');
  return null;
}

/**
 * 计算用户的全部勋章（排除未达标项）
 */
export function computeAllBadges(input: BadgeInput): EarnedBadge[] {
  return [
    computeCreditBadge(input),
    computeFulfillmentBadge(input),
    computeActivityBadge(input),
    computeReputationBadge(input),
  ].filter((b): b is EarnedBadge => b !== null);
}
