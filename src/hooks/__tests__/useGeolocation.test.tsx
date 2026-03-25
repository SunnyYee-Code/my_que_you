import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { formatDistance, getDistanceKm, useGeolocation } from '@/hooks/useGeolocation';

describe('useGeolocation utilities', () => {
  it('calculates distance in km', () => {
    const km = getDistanceKm(30.5728, 104.0668, 30.5729, 104.0768);
    expect(km).toBeGreaterThan(0.9);
    expect(km).toBeLessThan(1.1);
  });

  it('formats distance in meter and km', () => {
    expect(formatDistance(0.45)).toBe('450m');
    expect(formatDistance(1.26)).toBe('1.3km');
  });
});

describe('useGeolocation hook', () => {
  it('returns browser unsupported when geolocation missing', () => {
    const original = navigator.geolocation;
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.requestLocation());

    expect(result.current.error).toBe('浏览器不支持定位');
    Object.defineProperty(navigator, 'geolocation', { value: original, configurable: true });
  });

  it('stores position after successful request', async () => {
    const getCurrentPosition = vi.fn((success) => {
      success({ coords: { latitude: 30.57, longitude: 104.06 } });
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.requestLocation());

    await waitFor(() => {
      expect(result.current.position).toEqual({ lat: 30.57, lng: 104.06 });
    });
    expect(result.current.loading).toBe(false);
  });

  it('returns permission denied message on code 1 error', async () => {
    const getCurrentPosition = vi.fn((_, error) => {
      error({ code: 1 });
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.requestLocation());

    await waitFor(() => {
      expect(result.current.error).toBe('请允许定位权限');
    });
    expect(result.current.loading).toBe(false);
  });
});
