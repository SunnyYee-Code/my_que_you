import { describe, expect, it } from 'vitest';
import {
  getFavoriteLocationReuseState,
  sortFavoriteLocations,
  type FavoriteLocationRecord,
} from '@/lib/favorite-locations';

function makeFavorite(overrides: Partial<FavoriteLocationRecord> = {}): FavoriteLocationRecord {
  return {
    id: 'fav-1',
    user_id: 'user-1',
    city_id: 'city-1',
    city_name: '成都',
    name: '默认地点',
    address: '默认地址',
    latitude: 30.1,
    longitude: 104.1,
    note: '',
    last_used_at: '2026-04-01T10:00:00.000Z',
    updated_at: '2026-04-01T10:00:00.000Z',
    created_at: '2026-04-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('favorite-locations helpers', () => {
  it('sorts current-city favorites ahead of cross-city items and prioritizes recent usage', () => {
    const result = sortFavoriteLocations([
      makeFavorite({ id: 'cross-city', city_id: 'city-2', city_name: '上海', last_used_at: '2026-04-03T08:00:00.000Z' }),
      makeFavorite({ id: 'older-local', last_used_at: '2026-04-02T08:00:00.000Z' }),
      makeFavorite({ id: 'newer-local', last_used_at: '2026-04-03T09:00:00.000Z' }),
    ], 'city-1');

    expect(result.map(item => item.id)).toEqual(['newer-local', 'older-local', 'cross-city']);
  });

  it('marks favorites without full location info as unavailable', () => {
    const state = getFavoriteLocationReuseState(makeFavorite({ latitude: null, longitude: null }), 'city-1');

    expect(state.canReuse).toBe(false);
    expect(state.reason).toContain('地点信息不完整');
  });

  it('marks cross-city favorites as unavailable in the current city', () => {
    const state = getFavoriteLocationReuseState(makeFavorite({ city_id: 'city-2', city_name: '上海' }), 'city-1');

    expect(state.canReuse).toBe(false);
    expect(state.reason).toContain('切换到上海后可复用');
  });
});
