export type ActivitySlotEvent = 'impression' | 'click' | 'conversion';

export type ActivitySlotConfig = {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url: string;
  cta_text?: string;
  city_ids: string[];
  start_at: string | null;
  end_at: string | null;
  sort_order: number;
  enabled: boolean;
  max_impressions_per_session: number | null;
  created_at: string;
  updated_at: string;
};

export type ActivitySlotStats = {
  impressions: number;
  clicks: number;
  conversions: number;
  last_impression_at: string | null;
  last_click_at: string | null;
  last_conversion_at: string | null;
  updated_at: string | null;
};

export type ActivitySlotStatsMap = Record<string, ActivitySlotStats>;
export type ActivitySlotEventRecord = {
  slot_id: string;
  event_type: ActivitySlotEvent;
  created_at?: string | null;
};

type GetActiveActivitySlotsInput = {
  cityId: string;
  cityAliases?: string[];
  now?: string;
  sessionImpressionCounts?: Record<string, number>;
};

const ACTIVITY_PARAM_KEY = 'qy_activity_id';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toIsoString(value: unknown, fallback: string) {
  return isNonEmptyString(value) ? value : fallback;
}

export function parseActivitySlotConfig(value: unknown): ActivitySlotConfig | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  if (!isNonEmptyString(record.id) || !isNonEmptyString(record.title) || !isNonEmptyString(record.image_url) || !isNonEmptyString(record.link_url)) {
    return null;
  }

  return {
    id: record.id,
    title: record.title,
    subtitle: isNonEmptyString(record.subtitle) ? record.subtitle : undefined,
    image_url: record.image_url,
    link_url: record.link_url,
    cta_text: isNonEmptyString(record.cta_text) ? record.cta_text : undefined,
    city_ids: Array.isArray(record.city_ids) ? record.city_ids.filter(isNonEmptyString) : [],
    start_at: isNonEmptyString(record.start_at) ? record.start_at : null,
    end_at: isNonEmptyString(record.end_at) ? record.end_at : null,
    sort_order: typeof record.sort_order === 'number' ? record.sort_order : Number(record.sort_order ?? 0),
    enabled: Boolean(record.enabled),
    max_impressions_per_session:
      record.max_impressions_per_session === null || record.max_impressions_per_session === undefined || record.max_impressions_per_session === ''
        ? null
        : Number(record.max_impressions_per_session),
    created_at: toIsoString(record.created_at, new Date(0).toISOString()),
    updated_at: toIsoString(record.updated_at, new Date(0).toISOString()),
  };
}

export function parseActivitySlotConfigs(value: unknown): ActivitySlotConfig[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(parseActivitySlotConfig)
    .filter((item): item is ActivitySlotConfig => Boolean(item))
    .sort((left, right) => left.sort_order - right.sort_order);
}

export function parseActivitySlotStats(value: unknown): ActivitySlotStatsMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<ActivitySlotStatsMap>((acc, [slotId, slotValue]) => {
    if (!slotValue || typeof slotValue !== 'object' || Array.isArray(slotValue)) return acc;
    const record = slotValue as Record<string, unknown>;
    acc[slotId] = {
      impressions: Number(record.impressions ?? 0),
      clicks: Number(record.clicks ?? 0),
      conversions: Number(record.conversions ?? 0),
      last_impression_at: isNonEmptyString(record.last_impression_at) ? record.last_impression_at : null,
      last_click_at: isNonEmptyString(record.last_click_at) ? record.last_click_at : null,
      last_conversion_at: isNonEmptyString(record.last_conversion_at) ? record.last_conversion_at : null,
      updated_at: isNonEmptyString(record.updated_at) ? record.updated_at : null,
    };
    return acc;
  }, {});
}

export function aggregateActivitySlotStats(events: ActivitySlotEventRecord[]): ActivitySlotStatsMap {
  return events.reduce<ActivitySlotStatsMap>((acc, event) => {
    if (!isNonEmptyString(event.slot_id) || !event.event_type) return acc;
    return mergeActivitySlotStats(acc, event.slot_id, event.event_type, event.created_at ?? new Date().toISOString());
  }, {});
}

export function getActiveActivitySlots(slots: ActivitySlotConfig[], input: GetActiveActivitySlotsInput) {
  const now = new Date(input.now ?? new Date().toISOString());
  const sessionCounts = input.sessionImpressionCounts ?? {};
  const cityAliases = new Set([input.cityId, ...(input.cityAliases ?? [])].filter(isNonEmptyString));

  return slots
    .filter((slot) => {
      if (!slot.enabled) return false;
      if (slot.city_ids.length > 0 && !slot.city_ids.some((cityId) => cityAliases.has(cityId))) return false;
      if (slot.start_at && new Date(slot.start_at) > now) return false;
      if (slot.end_at && new Date(slot.end_at) < now) return false;
      if (!isActivityLinkSupported(slot.link_url)) return false;
      if (
        typeof slot.max_impressions_per_session === 'number'
        && Number.isFinite(slot.max_impressions_per_session)
        && (sessionCounts[slot.id] ?? 0) >= slot.max_impressions_per_session
      ) {
        return false;
      }
      return true;
    })
    .sort((left, right) => left.sort_order - right.sort_order);
}

export function isActivityLinkSupported(linkUrl: string) {
  if (!isNonEmptyString(linkUrl)) return false;
  if (linkUrl.startsWith('/')) return true;

  try {
    const url = new URL(linkUrl);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function buildActivitySlotHref(linkUrl: string, slotId: string) {
  if (!isActivityLinkSupported(linkUrl) || !isNonEmptyString(slotId)) return null;

  if (linkUrl.startsWith('/')) {
    const [pathname, hash = ''] = linkUrl.split('#');
    const [path, query = ''] = pathname.split('?');
    const searchParams = new URLSearchParams(query);
    searchParams.set(ACTIVITY_PARAM_KEY, slotId);
    return `${path}?${searchParams.toString()}${hash ? `#${hash}` : ''}`;
  }

  const url = new URL(linkUrl);
  url.searchParams.set(ACTIVITY_PARAM_KEY, slotId);
  return url.toString();
}

export function mergeActivitySlotStats(
  currentStats: ActivitySlotStatsMap,
  slotId: string,
  event: ActivitySlotEvent,
  now = new Date().toISOString(),
): ActivitySlotStatsMap {
  const existing = currentStats[slotId] ?? {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    last_impression_at: null,
    last_click_at: null,
    last_conversion_at: null,
    updated_at: null,
  };

  const next = {
    ...existing,
    updated_at: now,
  };

  if (event === 'impression') {
    next.impressions += 1;
    next.last_impression_at = now;
  }
  if (event === 'click') {
    next.clicks += 1;
    next.last_click_at = now;
  }
  if (event === 'conversion') {
    next.conversions += 1;
    next.last_conversion_at = now;
  }

  return {
    ...currentStats,
    [slotId]: next,
  };
}

export function getActivitySessionStorageKey(slotId: string) {
  return `activity-slot-impression:${slotId}`;
}

export function getActivityConversionStorageKey(slotId: string, pathname: string) {
  return `activity-slot-conversion:${slotId}:${pathname}`;
}

export function getActivityIdFromSearch(search: string) {
  return new URLSearchParams(search).get(ACTIVITY_PARAM_KEY);
}

export function normalizeActivitySlotCityIds(rawValue: string, allCities: Array<{ id: string; name: string }>) {
  const byAlias = new Map<string, string>();
  allCities.forEach((city) => {
    byAlias.set(city.id.toLowerCase(), city.id);
    byAlias.set(city.name.toLowerCase(), city.id);
  });

  return rawValue
    .split(/[，,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => byAlias.get(value.toLowerCase()) ?? value)
    .filter((value, index, list) => list.indexOf(value) === index);
}

export function formatActivitySlotCityIds(cityIds: string[], allCities: Array<{ id: string; name: string }>) {
  if (cityIds.length === 0) return '';

  const cityNameById = new Map(allCities.map((city) => [city.id, city.name]));
  return cityIds.map((cityId) => cityNameById.get(cityId) ?? cityId).join(',');
}
