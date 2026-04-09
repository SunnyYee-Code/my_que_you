import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Supabase
const mockSelect = vi.fn();
const mockGte = vi.fn();
const mockEq = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { useLeaderboard, useUserLeaderboardRank } from '@/hooks/useLeaderboard';

describe('useLeaderboard', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    // Default chain: from().select().gte().eq()
    mockEq.mockResolvedValue({ data: [], error: null });
    mockGte.mockReturnValue({ eq: mockEq });
    mockSelect.mockReturnValue({ gte: mockGte });
  });

  it('should query group_members with weekly period (7 days)', async () => {
    renderHook(() => useLeaderboard('weekly'), { wrapper });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('group_members');
      expect(mockSelect).toHaveBeenCalledWith(
        'user_id, joined_at, profiles!inner(nickname, avatar_url, credit_score, show_in_leaderboard)',
      );
    });
  });

  it('should filter by show_in_leaderboard = true', async () => {
    renderHook(() => useLeaderboard('monthly'), { wrapper });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('profiles.show_in_leaderboard', true);
    });
  });

  it('should aggregate participation count per user and sort descending', async () => {
    mockEq.mockResolvedValue({
      data: [
        { user_id: 'u1', joined_at: '2026-04-01', profiles: { nickname: 'Alice', avatar_url: null, credit_score: 100, show_in_leaderboard: true } },
        { user_id: 'u1', joined_at: '2026-04-02', profiles: { nickname: 'Alice', avatar_url: null, credit_score: 100, show_in_leaderboard: true } },
        { user_id: 'u2', joined_at: '2026-04-01', profiles: { nickname: 'Bob', avatar_url: null, credit_score: 90, show_in_leaderboard: true } },
        { user_id: 'u1', joined_at: '2026-04-03', profiles: { nickname: 'Alice', avatar_url: null, credit_score: 100, show_in_leaderboard: true } },
      ],
      error: null,
    });

    const { result } = renderHook(() => useLeaderboard('monthly'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
      expect(result.current.data!.length).toBe(2);
      // Alice has 3 participations, Bob has 1
      expect(result.current.data![0].userId).toBe('u1');
      expect(result.current.data![0].participationCount).toBe(3);
      expect(result.current.data![0].rank).toBe(1);
      expect(result.current.data![1].userId).toBe('u2');
      expect(result.current.data![1].participationCount).toBe(1);
      expect(result.current.data![1].rank).toBe(2);
    });
  });

  it('should return empty array when no data', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useLeaderboard('weekly'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  it('should throw on supabase error', async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: 'db error' } });

    const { result } = renderHook(() => useLeaderboard('monthly'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});

describe('useUserLeaderboardRank', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    mockEq.mockResolvedValue({
      data: [
        { user_id: 'u1', joined_at: '2026-04-01', profiles: { nickname: 'Alice', avatar_url: null, credit_score: 100, show_in_leaderboard: true } },
        { user_id: 'u1', joined_at: '2026-04-02', profiles: { nickname: 'Alice', avatar_url: null, credit_score: 100, show_in_leaderboard: true } },
        { user_id: 'u2', joined_at: '2026-04-01', profiles: { nickname: 'Bob', avatar_url: null, credit_score: 90, show_in_leaderboard: true } },
      ],
      error: null,
    });
    mockGte.mockReturnValue({ eq: mockEq });
    mockSelect.mockReturnValue({ gte: mockGte });
  });

  it('should return rank for existing user', async () => {
    const { result } = renderHook(() => useUserLeaderboardRank('u1', 'monthly'), { wrapper });

    await waitFor(() => {
      expect(result.current.rank).toBe(1);
      expect(result.current.participationCount).toBe(2);
    });
  });

  it('should return null rank for user not in leaderboard', async () => {
    const { result } = renderHook(() => useUserLeaderboardRank('u999', 'monthly'), { wrapper });

    await waitFor(() => {
      expect(result.current.rank).toBeNull();
      expect(result.current.participationCount).toBe(0);
    });
  });

  it('should return null rank when userId is undefined', async () => {
    const { result } = renderHook(() => useUserLeaderboardRank(undefined), { wrapper });

    await waitFor(() => {
      expect(result.current.rank).toBeNull();
    });
  });
});
