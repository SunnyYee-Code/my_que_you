import { describe, expect, it } from 'vitest';
import { formatDistance, getDistanceKm } from '@/hooks/useGeolocation';

describe('geolocation utils', () => {
  it('computes distance between two points', () => {
    const distance = getDistanceKm(30, 104, 30.01, 104.01);
    expect(distance).toBeGreaterThan(1);
    expect(distance).toBeLessThan(2);
  });

  it('formats meter distance below 1km', () => {
    expect(formatDistance(0.45)).toBe('450m');
  });

  it('formats kilometer distance above 1km', () => {
    expect(formatDistance(1.26)).toBe('1.3km');
  });
});
