import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  aggregateActivitySlotStats,
  getActiveActivitySlots,
  getActivitySessionStorageKey,
  mergeActivitySlotStats,
  parseActivitySlotConfigs,
  parseActivitySlotStats,
  type ActivitySlotConfig,
  type ActivitySlotEvent,
  type ActivitySlotStatsMap,
} from '@/lib/activity-slots';

type ActivitySettingsPayload = {
  configs: ActivitySlotConfig[];
  stats: ActivitySlotStatsMap;
};

const ACTIVITY_CONFIG_KEY = 'homepage_activity_slots';
const ACTIVITY_STATS_KEY = 'activity_slot_stats';

async function fetchActivitySettings(): Promise<ActivitySettingsPayload> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .in('key', [ACTIVITY_CONFIG_KEY, ACTIVITY_STATS_KEY]);

  if (error) throw error;

  const configRow = data?.find((item) => item.key === ACTIVITY_CONFIG_KEY);
  const statsRow = data?.find((item) => item.key === ACTIVITY_STATS_KEY);

  let stats = parseActivitySlotStats(statsRow?.value);
  const eventsQuery = await supabase
    .from('activity_slot_events' as any)
    .select('slot_id, event_type, created_at');

  if (!eventsQuery.error && Array.isArray(eventsQuery.data)) {
    stats = aggregateActivitySlotStats(eventsQuery.data as Array<{ slot_id: string; event_type: ActivitySlotEvent; created_at?: string | null }>);
  }

  return {
    configs: parseActivitySlotConfigs(configRow?.value),
    stats,
  };
}

function readSessionImpressionCounts(slots: ActivitySlotConfig[]) {
  if (typeof window === 'undefined') return {};

  return slots.reduce<Record<string, number>>((acc, slot) => {
    const raw = window.sessionStorage.getItem(getActivitySessionStorageKey(slot.id));
    acc[slot.id] = raw ? Number(raw) : 0;
    return acc;
  }, {});
}

export function useActivitySlots(cityId: string, cityAliases: string[] = []) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['activity-slots', cityId],
    queryFn: fetchActivitySettings,
  });

  const trackMutation = useMutation({
    mutationFn: async ({ slotId, event }: { slotId: string; event: ActivitySlotEvent }) => {
      const now = new Date().toISOString();

      const { error } = await supabase.from('activity_slot_events' as any).insert({
        slot_id: slotId,
        event_type: event,
        created_at: now,
      });

      if (error) throw error;

      return { slotId, event, now };
    },
    onSuccess: ({ slotId, event, now }) => {
      queryClient.setQueryData<ActivitySettingsPayload | undefined>(['activity-slots', cityId], (current) => {
        if (!current) {
          return {
            configs: [],
            stats: mergeActivitySlotStats({}, slotId, event, now),
          };
        }

        return {
          ...current,
          stats: mergeActivitySlotStats(current.stats, slotId, event, now),
        };
      });
    },
  });

  const settings = query.data ?? { configs: [], stats: {} };
  const sessionCounts = readSessionImpressionCounts(settings.configs);
  const slots = getActiveActivitySlots(settings.configs, {
    cityId,
    cityAliases,
    sessionImpressionCounts: sessionCounts,
  });

  const trackActivityEvent = async (slotId: string, event: ActivitySlotEvent) => {
    if (!slotId) return;
    await trackMutation.mutateAsync({ slotId, event });
  };

  const markSlotImpressionSeen = (slotId: string) => {
    if (typeof window === 'undefined') return;
    const key = getActivitySessionStorageKey(slotId);
    const currentValue = Number(window.sessionStorage.getItem(key) ?? 0);
    window.sessionStorage.setItem(key, String(currentValue + 1));
  };

  return {
    slots,
    stats: settings.stats,
    isLoading: query.isLoading,
    trackActivityEvent,
    markSlotImpressionSeen,
  };
}
