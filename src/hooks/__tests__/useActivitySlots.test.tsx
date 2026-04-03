import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useActivitySlots } from '@/hooks/useActivitySlots';

const supabaseMock = vi.hoisted(() => {
  const state = {
    settingsRows: [] as any[],
    eventRows: [] as any[],
    insertedEvents: [] as any[],
  };

  return {
    state,
    client: {
      from: vi.fn((table: string) => {
        if (table === 'system_settings') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({
                data: state.settingsRows,
                error: null,
              })),
            })),
          };
        }

        if (table === 'activity_slot_events') {
          return {
            select: vi.fn(async () => ({
              data: state.eventRows,
              error: null,
            })),
            insert: vi.fn(async (payload: any) => {
              state.insertedEvents.push(payload);
              return { error: null };
            }),
          };
        }

        throw new Error(`unexpected table: ${table}`);
      }),
    },
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock.client,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useActivitySlots', () => {
  beforeEach(() => {
    supabaseMock.state.settingsRows = [];
    supabaseMock.state.eventRows = [];
    supabaseMock.state.insertedEvents = [];
    window.sessionStorage.clear();
  });

  it('loads configs, applies city alias filtering, and respects session exposure cap', async () => {
    supabaseMock.state.settingsRows = [
      {
        key: 'homepage_activity_slots',
        value: [
          {
            id: 'slot-city-name',
            title: '杭州限定活动',
            image_url: 'https://example.com/a.png',
            link_url: '/community',
            city_ids: ['杭州'],
            start_at: '2026-04-01T00:00:00.000Z',
            end_at: '2026-04-10T00:00:00.000Z',
            sort_order: 1,
            enabled: true,
            max_impressions_per_session: null,
          },
          {
            id: 'slot-limited',
            title: '频控活动',
            image_url: 'https://example.com/b.png',
            link_url: '/group/create',
            city_ids: ['hz'],
            start_at: '2026-04-01T00:00:00.000Z',
            end_at: '2026-04-10T00:00:00.000Z',
            sort_order: 2,
            enabled: true,
            max_impressions_per_session: 1,
          },
        ],
      },
      { key: 'activity_slot_stats', value: {} },
    ];

    window.sessionStorage.setItem('activity-slot-impression:slot-limited', '1');

    const { result } = renderHook(() => useActivitySlots('hz', ['杭州']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.slots.map((slot) => slot.id)).toEqual(['slot-city-name']);
    });
  });

  it('tracks events through activity_slot_events and updates cached stats', async () => {
    supabaseMock.state.settingsRows = [
      {
        key: 'homepage_activity_slots',
        value: [{
          id: 'slot-1',
          title: '活动 1',
          image_url: 'https://example.com/a.png',
          link_url: '/community',
          city_ids: [],
          start_at: '2026-04-01T00:00:00.000Z',
          end_at: '2026-04-10T00:00:00.000Z',
          sort_order: 1,
          enabled: true,
          max_impressions_per_session: null,
        }],
      },
      { key: 'activity_slot_stats', value: {} },
    ];
    supabaseMock.state.eventRows = [
      { slot_id: 'slot-1', event_type: 'impression', created_at: '2026-04-03T10:00:00.000Z' },
    ];

    const { result } = renderHook(() => useActivitySlots('hz', ['杭州']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.stats['slot-1']?.impressions).toBe(1);
    });

    await result.current.trackActivityEvent('slot-1', 'click');

    expect(supabaseMock.state.insertedEvents).toEqual([
      expect.objectContaining({
        slot_id: 'slot-1',
        event_type: 'click',
      }),
    ]);

    await waitFor(() => {
      expect(result.current.stats['slot-1']).toMatchObject({
        impressions: 1,
        clicks: 1,
        conversions: 0,
      });
    });
  });
});
