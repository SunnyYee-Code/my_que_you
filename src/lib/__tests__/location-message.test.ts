import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseLocationMeta,
  isLocationExpired,
  createLocationMeta,
  getAmapNavigationUrl,
  buildLocationContent,
  LOCATION_EXPIRY_HOURS,
} from '../location-message';

describe('parseLocationMeta', () => {
  it('returns null for null input', () => {
    expect(parseLocationMeta(null)).toBeNull();
  });

  it('returns null for non-object', () => {
    expect(parseLocationMeta('string')).toBeNull();
    expect(parseLocationMeta(42)).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(parseLocationMeta({ address: '成都', lat: 30 })).toBeNull();
    expect(parseLocationMeta({ address: '成都', lat: 30, lng: 104 })).toBeNull();
  });

  it('returns null when types are wrong', () => {
    expect(parseLocationMeta({ address: 123, lat: 30, lng: 104, expires_at: '2026-01-01' })).toBeNull();
    expect(parseLocationMeta({ address: '成都', lat: '30', lng: 104, expires_at: '2026-01-01' })).toBeNull();
  });

  it('returns parsed meta for valid input', () => {
    const result = parseLocationMeta({ address: '成都市武侯区', lat: 30.65, lng: 104.06, expires_at: '2026-04-09T10:00:00Z' });
    expect(result).toEqual({ address: '成都市武侯区', lat: 30.65, lng: 104.06, expires_at: '2026-04-09T10:00:00Z' });
  });
});

describe('isLocationExpired', () => {
  it('returns true for past date', () => {
    expect(isLocationExpired('2020-01-01T00:00:00Z')).toBe(true);
  });

  it('returns false for future date', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(isLocationExpired(future)).toBe(false);
  });
});

describe('createLocationMeta', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('creates meta with correct fields', () => {
    vi.setSystemTime(new Date('2026-04-08T10:00:00Z'));
    const meta = createLocationMeta('成都市锦江区', 30.659, 104.065);
    expect(meta.address).toBe('成都市锦江区');
    expect(meta.lat).toBe(30.659);
    expect(meta.lng).toBe(104.065);
    expect(typeof meta.expires_at).toBe('string');
  });

  it(`sets expiry ${LOCATION_EXPIRY_HOURS} hours from now`, () => {
    vi.setSystemTime(new Date('2026-04-08T10:00:00Z'));
    const meta = createLocationMeta('测试', 30, 104);
    const expiresAt = new Date(meta.expires_at);
    const expectedExpiry = new Date('2026-04-08T10:00:00Z');
    expectedExpiry.setHours(expectedExpiry.getHours() + LOCATION_EXPIRY_HOURS);
    expect(expiresAt.getTime()).toBe(expectedExpiry.getTime());
  });

  it('freshly created meta is not expired', () => {
    vi.setSystemTime(new Date('2026-04-08T10:00:00Z'));
    const meta = createLocationMeta('测试', 30, 104);
    expect(isLocationExpired(meta.expires_at)).toBe(false);
  });
});

describe('getAmapNavigationUrl', () => {
  it('includes lat, lng, and encoded address', () => {
    const url = getAmapNavigationUrl(30.659, 104.065, '成都市武侯区');
    expect(url).toContain('104.065');
    expect(url).toContain('30.659');
    expect(url).toContain(encodeURIComponent('成都市武侯区'));
    expect(url).toContain('uri.amap.com/navigation');
  });
});

describe('buildLocationContent', () => {
  it('prefixes address with [位置]', () => {
    expect(buildLocationContent('成都市武侯区天府大道')).toBe('[位置] 成都市武侯区天府大道');
  });
});
