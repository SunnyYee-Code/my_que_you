import { describe, expect, it } from 'vitest';
import { buildFulfillmentProfile, normalizeReviewTags } from '@/lib/review-insights';

describe('review insights', () => {
  it('normalizes tags by filtering invalid values and removing duplicates', () => {
    expect(
      normalizeReviewTags(['准时守约', '沟通顺畅', '无效标签', '准时守约', '迟到']),
    ).toEqual(['准时守约', '沟通顺畅', '迟到']);
  });

  it('builds fulfillment profile from reviews and group history', () => {
    const summary = buildFulfillmentProfile({
      userId: 'user-1',
      reviews: [
        { id: 'r1', target_id: 'user-1', tags: ['准时守约', '沟通顺畅', '牌品好'] },
        { id: 'r2', target_id: 'user-1', tags: ['准时守约', '新手友好', '迟到'] },
        { id: 'r3', target_id: 'user-1', tags: ['沟通顺畅'] },
      ],
      groups: [
        { id: 'g1', status: 'COMPLETED', host_id: 'user-1' },
        { id: 'g2', status: 'COMPLETED', host_id: 'host-2' },
        { id: 'g3', status: 'CANCELLED', host_id: 'host-3' },
        { id: 'g4', status: 'OPEN', host_id: 'host-4' },
      ],
      exits: [{ id: 'e1', user_id: 'user-1', exit_type: 'left' }],
    });

    expect(summary.completedCount).toBe(2);
    expect(summary.breachCount).toBe(1);
    expect(summary.trackedGroupCount).toBe(3);
    expect(summary.fulfillmentRate).toBe(67);
    expect(summary.topPositiveTags).toEqual(['准时守约', '沟通顺畅', '牌品好']);
    expect(summary.topRiskTags).toEqual(['迟到']);
  });

  it('returns null fulfillment rate when user has no tracked history', () => {
    const summary = buildFulfillmentProfile({
      userId: 'new-user',
      reviews: [],
      groups: [],
      exits: [],
    });

    expect(summary.fulfillmentRate).toBeNull();
    expect(summary.trackedGroupCount).toBe(0);
  });
});
