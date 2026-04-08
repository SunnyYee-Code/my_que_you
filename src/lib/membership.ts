export type MemberTier = 'free' | 'silver' | 'gold';

export interface MembershipBenefit {
  key: string;
  name: string;
  description: string;
  icon: string;
}

export interface MemberTierInfo {
  tier: MemberTier;
  name: string;
  description: string;
  benefits: MembershipBenefit[];
  color: string;
}

// 4类核心权益定义
export const MEMBERSHIP_BENEFITS: Record<string, MembershipBenefit> = {
  avatar_frame: {
    key: 'avatar_frame',
    name: '专属头像框',
    description: '独家头像框，展示会员身份',
    icon: '👑',
  },
  member_badge: {
    key: 'member_badge',
    name: '会员标签',
    description: '个人主页展示会员身份徽章',
    icon: '✨',
  },
  scorer_premium: {
    key: 'scorer_premium',
    name: '记分器高级功能',
    description: '解锁历史记录、多桌管理等高级功能',
    icon: '📊',
  },
  priority_exposure: {
    key: 'priority_exposure',
    name: '曝光加权',
    description: '发布局组在首页排序略微靠前',
    icon: '📈',
  },
};

// 会员等级信息
export const MEMBER_TIERS: Record<MemberTier, MemberTierInfo> = {
  free: {
    tier: 'free',
    name: '免费用户',
    description: '享受核心功能，完整的找局、加入、聊天体验',
    benefits: [],
    color: 'gray',
  },
  silver: {
    tier: 'silver',
    name: '银卡会员',
    description: '解锁部分高级功能，增强个人品牌',
    benefits: [
      MEMBERSHIP_BENEFITS.member_badge,
      MEMBERSHIP_BENEFITS.scorer_premium,
    ],
    color: 'slate',
  },
  gold: {
    tier: 'gold',
    name: '金卡会员',
    description: '全面解锁会员权益，尊享顶级体验',
    benefits: [
      MEMBERSHIP_BENEFITS.avatar_frame,
      MEMBERSHIP_BENEFITS.member_badge,
      MEMBERSHIP_BENEFITS.scorer_premium,
      MEMBERSHIP_BENEFITS.priority_exposure,
    ],
    color: 'yellow',
  },
};

export function getTierInfo(tier: MemberTier): MemberTierInfo {
  return MEMBER_TIERS[tier] || MEMBER_TIERS.free;
}

export function isMember(isMember: boolean, tier: MemberTier): boolean {
  return isMember && tier !== 'free';
}

export function getMemberBadgeText(tier: MemberTier): string {
  const tierInfo = getTierInfo(tier);
  return tierInfo.tier === 'free' ? '' : `${tierInfo.name}`;
}

export function getMemberBadgeColor(tier: MemberTier): string {
  const tierInfo = getTierInfo(tier);
  if (tierInfo.tier === 'gold') return '#FCD34D';
  if (tierInfo.tier === 'silver') return '#E2E8F0';
  return '#D1D5DB';
}

export function hasBenefit(tier: MemberTier, benefitKey: string): boolean {
  const tierInfo = getTierInfo(tier);
  return tierInfo.benefits.some(b => b.key === benefitKey);
}
