import { describe, expect, it } from 'vitest';
import {
  aggregateActivitySlotStats,
  buildActivitySlotHref,
  getActiveActivitySlots,
  mergeActivitySlotStats,
  type ActivitySlotConfig,
  type ActivitySlotStatsMap,
} from '@/lib/activity-slots';

function makeSlot(overrides: Partial<ActivitySlotConfig> = {}): ActivitySlotConfig {
  return {
    id: 'slot-1',
    title: '春日活动',
    image_url: 'https://example.com/banner.png',
    link_url: '/group/create',
    city_ids: [],
    start_at: '2026-04-01T00:00:00.000Z',
    end_at: '2026-04-10T00:00:00.000Z',
    sort_order: 20,
    enabled: true,
    max_impressions_per_session: null,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('activity-slots helpers', () => {
  it('filters inactive slots and sorts active slots by sort order', () => {
    const result = getActiveActivitySlots([
      makeSlot({ id: 'city-all', sort_order: 30 }),
      makeSlot({ id: 'priority-city', city_ids: ['hz'], sort_order: 5 }),
      makeSlot({ id: 'expired', end_at: '2026-04-02T00:00:00.000Z' }),
      makeSlot({ id: 'disabled', enabled: false }),
      makeSlot({ id: 'wrong-city', city_ids: ['cd'] }),
    ], {
      cityId: 'hz',
      now: '2026-04-03T10:00:00.000Z',
      sessionImpressionCounts: {},
    });

    expect(result.map(item => item.id)).toEqual(['priority-city', 'city-all']);
  });

  it('matches city aliases so legacy city names still resolve to city ids', () => {
    const result = getActiveActivitySlots([
      makeSlot({ id: 'city-name', city_ids: ['杭州'] }),
      makeSlot({ id: 'city-id', city_ids: ['hz'] }),
    ], {
      cityId: 'hz',
      cityAliases: ['杭州'],
      now: '2026-04-03T10:00:00.000Z',
      sessionImpressionCounts: {},
    });

    expect(result.map(item => item.id)).toEqual(['city-name', 'city-id']);
  });

  it('hides slots that have reached the session exposure limit', () => {
    const result = getActiveActivitySlots([
      makeSlot({ id: 'limit-hit', max_impressions_per_session: 1 }),
      makeSlot({ id: 'still-visible', max_impressions_per_session: 2 }),
    ], {
      cityId: 'hz',
      now: '2026-04-03T10:00:00.000Z',
      sessionImpressionCounts: {
        'limit-hit': 1,
        'still-visible': 1,
      },
    });

    expect(result.map(item => item.id)).toEqual(['still-visible']);
  });

  it('builds tracked hrefs for internal and external links and rejects unsafe targets', () => {
    expect(buildActivitySlotHref('/group/create', 'slot-9')).toBe('/group/create?qy_activity_id=slot-9');
    expect(buildActivitySlotHref('https://example.com/path?foo=1', 'slot-9')).toBe('https://example.com/path?foo=1&qy_activity_id=slot-9');
    expect(buildActivitySlotHref('javascript:alert(1)', 'slot-9')).toBeNull();
  });

  it('merges impression, click and conversion stats by slot id', () => {
    const base: ActivitySlotStatsMap = {
      'slot-1': {
        impressions: 2,
        clicks: 1,
        conversions: 0,
        last_impression_at: '2026-04-02T08:00:00.000Z',
        last_click_at: '2026-04-02T09:00:00.000Z',
        last_conversion_at: null,
        updated_at: '2026-04-02T09:00:00.000Z',
      },
    };

    const afterImpression = mergeActivitySlotStats(base, 'slot-1', 'impression', '2026-04-03T10:00:00.000Z');
    const afterClick = mergeActivitySlotStats(afterImpression, 'slot-1', 'click', '2026-04-03T10:05:00.000Z');
    const afterConversion = mergeActivitySlotStats(afterClick, 'slot-1', 'conversion', '2026-04-03T10:10:00.000Z');

    expect(afterConversion['slot-1']).toEqual({
      impressions: 3,
      clicks: 2,
      conversions: 1,
      last_impression_at: '2026-04-03T10:00:00.000Z',
      last_click_at: '2026-04-03T10:05:00.000Z',
      last_conversion_at: '2026-04-03T10:10:00.000Z',
      updated_at: '2026-04-03T10:10:00.000Z',
    });
  });

  it('aggregates append-only event records into slot stats', () => {
    const result = aggregateActivitySlotStats([
      { slot_id: 'slot-1', event_type: 'impression', created_at: '2026-04-03T10:00:00.000Z' },
      { slot_id: 'slot-1', event_type: 'click', created_at: '2026-04-03T10:01:00.000Z' },
      { slot_id: 'slot-1', event_type: 'conversion', created_at: '2026-04-03T10:02:00.000Z' },
      { slot_id: 'slot-2', event_type: 'impression', created_at: '2026-04-03T11:00:00.000Z' },
    ]);

    expect(result['slot-1']).toMatchObject({
      impressions: 1,
      clicks: 1,
      conversions: 1,
      last_conversion_at: '2026-04-03T10:02:00.000Z',
    });
    expect(result['slot-2']).toMatchObject({
      impressions: 1,
      clicks: 0,
      conversions: 0,
    });
  });
});
