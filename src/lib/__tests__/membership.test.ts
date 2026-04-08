import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTierInfo,
  isMember,
  getMemberBadgeText,
  getMemberBadgeColor,
  hasBenefit,
  MEMBER_TIERS,
  MEMBERSHIP_BENEFITS,
  type MemberTier,
} from '@/lib/membership';

describe('Membership Benefits', () => {
  describe('getTierInfo', () => {
    it('should return tier info for free user', () => {
      const info = getTierInfo('free');
      expect(info.tier).toBe('free');
      expect(info.name).toBe('免费用户');
      expect(info.benefits).toHaveLength(0);
    });

    it('should return tier info for silver member', () => {
      const info = getTierInfo('silver');
      expect(info.tier).toBe('silver');
      expect(info.name).toBe('银卡会员');
      expect(info.benefits.length).toBeGreaterThan(0);
    });

    it('should return tier info for gold member', () => {
      const info = getTierInfo('gold');
      expect(info.tier).toBe('gold');
      expect(info.name).toBe('金卡会员');
      expect(info.benefits).toHaveLength(4);
    });

    it('should return free tier info for invalid tier', () => {
      const info = getTierInfo('invalid' as MemberTier);
      expect(info.tier).toBe('free');
    });
  });

  describe('isMember', () => {
    it('should return false for free user', () => {
      expect(isMember(false, 'free')).toBe(false);
    });

    it('should return false for is_member=true but tier=free', () => {
      expect(isMember(true, 'free')).toBe(false);
    });

    it('should return true for silver member', () => {
      expect(isMember(true, 'silver')).toBe(true);
    });

    it('should return true for gold member', () => {
      expect(isMember(true, 'gold')).toBe(true);
    });
  });

  describe('getMemberBadgeText', () => {
    it('should return empty string for free user', () => {
      expect(getMemberBadgeText('free')).toBe('');
    });

    it('should return tier name for silver member', () => {
      expect(getMemberBadgeText('silver')).toBe('银卡会员');
    });

    it('should return tier name for gold member', () => {
      expect(getMemberBadgeText('gold')).toBe('金卡会员');
    });
  });

  describe('getMemberBadgeColor', () => {
    it('should return gold color for gold member', () => {
      expect(getMemberBadgeColor('gold')).toBe('#FCD34D');
    });

    it('should return silver color for silver member', () => {
      expect(getMemberBadgeColor('silver')).toBe('#E2E8F0');
    });

    it('should return gray color for free user', () => {
      expect(getMemberBadgeColor('free')).toBe('#D1D5DB');
    });
  });

  describe('hasBenefit', () => {
    it('should return false for free user', () => {
      expect(hasBenefit('free', 'member_badge')).toBe(false);
    });

    it('should return true for silver member with member_badge', () => {
      expect(hasBenefit('silver', 'member_badge')).toBe(true);
    });

    it('should return true for silver member with scorer_premium', () => {
      expect(hasBenefit('silver', 'scorer_premium')).toBe(true);
    });

    it('should return false for silver member without avatar_frame', () => {
      expect(hasBenefit('silver', 'avatar_frame')).toBe(false);
    });

    it('should return true for gold member with all benefits', () => {
      expect(hasBenefit('gold', 'avatar_frame')).toBe(true);
      expect(hasBenefit('gold', 'member_badge')).toBe(true);
      expect(hasBenefit('gold', 'scorer_premium')).toBe(true);
      expect(hasBenefit('gold', 'priority_exposure')).toBe(true);
    });
  });

  describe('Membership Tiers Structure', () => {
    it('should have all required tiers', () => {
      expect(MEMBER_TIERS).toHaveProperty('free');
      expect(MEMBER_TIERS).toHaveProperty('silver');
      expect(MEMBER_TIERS).toHaveProperty('gold');
    });

    it('should have correct number of benefits for each tier', () => {
      expect(MEMBER_TIERS.free.benefits).toHaveLength(0);
      expect(MEMBER_TIERS.silver.benefits.length).toBeGreaterThan(0);
      expect(MEMBER_TIERS.gold.benefits.length).toBeGreaterThan(
        MEMBER_TIERS.silver.benefits.length
      );
    });

    it('should not have duplicate benefits within a tier', () => {
      Object.values(MEMBER_TIERS).forEach(tier => {
        const keys = tier.benefits.map(b => b.key);
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(keys.length);
      });
    });
  });

  describe('Membership Benefits', () => {
    it('should have 4 core benefits', () => {
      expect(Object.keys(MEMBERSHIP_BENEFITS)).toHaveLength(4);
    });

    it('should have required benefit properties', () => {
      Object.values(MEMBERSHIP_BENEFITS).forEach(benefit => {
        expect(benefit).toHaveProperty('key');
        expect(benefit).toHaveProperty('name');
        expect(benefit).toHaveProperty('description');
        expect(benefit).toHaveProperty('icon');
      });
    });

    it('should have unique benefit keys', () => {
      const keys = Object.keys(MEMBERSHIP_BENEFITS);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });
});
