import { compareGroupsByEmergencyFill } from '@/lib/group-emergency-fill';

export type GroupSortMode = 'recommended' | 'time_asc' | 'time_desc' | 'distance';

type GroupMember = {
  user_id?: string | null;
};

type RecommendableGroup = {
  status?: string | null;
  needed_slots?: number | null;
  start_time?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  play_style?: string | null;
  distance?: number | null;
  host_id?: string | null;
  members?: GroupMember[] | null;
};

type SortOptions = {
  now?: Date;
  preferredPlayStyles?: string[];
  sortMode?: GroupSortMode;
};

const PREFERENCE_HISTORY_STATUSES = new Set(['FULL', 'IN_PROGRESS', 'COMPLETED']);

function getSafeTime(value: string | null | undefined) {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

function getDistanceScore(distance: number | null | undefined) {
  if (distance === null || distance === undefined) return 12;
  if (distance <= 1) return 42;
  if (distance <= 3) return 34;
  if (distance <= 5) return 26;
  if (distance <= 10) return 18;
  if (distance <= 20) return 10;
  return 4;
}

function getTimeScore(startTime: string | null | undefined, now: Date) {
  const startAt = getSafeTime(startTime);
  if (!Number.isFinite(startAt)) return 0;

  const diffHours = (startAt - now.getTime()) / 3_600_000;
  if (diffHours <= 0) return -20;
  if (diffHours <= 2) return 38;
  if (diffHours <= 6) return 32;
  if (diffHours <= 12) return 24;
  if (diffHours <= 24) return 18;
  if (diffHours <= 48) return 10;
  if (diffHours <= 72) return 4;
  return 0;
}

function getFreshnessScore(group: RecommendableGroup, now: Date) {
  const freshnessTime = getSafeTime(group.created_at) || getSafeTime(group.updated_at);
  if (!Number.isFinite(freshnessTime)) return 0;

  const diffHours = (now.getTime() - freshnessTime) / 3_600_000;
  if (diffHours <= 24) return 8;
  if (diffHours <= 72) return 4;
  return 0;
}

function getPreferenceScore(playStyle: string | null | undefined, preferredPlayStyles: string[]) {
  if (!playStyle) return 0;
  return preferredPlayStyles.includes(playStyle) ? 20 : 0;
}

function getAvailabilityScore(status: string | null | undefined) {
  if (status === 'OPEN') return 18;
  if (status === 'FULL') return -12;
  if (status === 'IN_PROGRESS') return -24;
  return -8;
}

export function inferPreferredPlayStyles<T extends RecommendableGroup>(groups: T[], userId?: string | null) {
  if (!userId) return [];

  const weights = new Map<string, number>();
  groups.forEach(group => {
    if (!group.play_style) return;
    if (!PREFERENCE_HISTORY_STATUSES.has(group.status ?? '')) return;

    const isHost = group.host_id === userId;
    const isMember = group.members?.some(member => member.user_id === userId) ?? false;
    if (!isHost && !isMember) return;

    const currentWeight = weights.get(group.play_style) ?? 0;
    weights.set(group.play_style, currentWeight + 1);
  });

  return Array.from(weights.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-CN'))
    .map(([playStyle]) => playStyle);
}

export function getGroupRecommendationScore<T extends RecommendableGroup>(
  group: T,
  { now = new Date(), preferredPlayStyles = [] }: SortOptions = {},
) {
  return (
    getAvailabilityScore(group.status)
    +
    getDistanceScore(group.distance)
    + getTimeScore(group.start_time, now)
    + getPreferenceScore(group.play_style, preferredPlayStyles)
    + getFreshnessScore(group, now)
  );
}

function compareByDistance(left: RecommendableGroup, right: RecommendableGroup) {
  if (left.distance === null || left.distance === undefined) {
    if (right.distance === null || right.distance === undefined) return 0;
    return 1;
  }
  if (right.distance === null || right.distance === undefined) return -1;
  return left.distance - right.distance;
}

function compareByTimeAsc(left: RecommendableGroup, right: RecommendableGroup) {
  return getSafeTime(left.start_time) - getSafeTime(right.start_time);
}

function compareByFreshnessDesc(left: RecommendableGroup, right: RecommendableGroup) {
  const leftTime = getSafeTime(left.created_at) || getSafeTime(left.updated_at) || getSafeTime(left.start_time);
  const rightTime = getSafeTime(right.created_at) || getSafeTime(right.updated_at) || getSafeTime(right.start_time);
  return rightTime - leftTime;
}

export function sortGroupsByRecommendation<T extends RecommendableGroup>(
  groups: T[],
  options: SortOptions = {},
) {
  return sortGroupsForDisplay(groups, { ...options, sortMode: 'recommended' });
}

export function sortGroupsForDisplay<T extends RecommendableGroup>(
  groups: T[],
  { now = new Date(), preferredPlayStyles = [], sortMode = 'recommended' }: SortOptions = {},
) {
  return [...groups].sort((left, right) => {
    const emergencyPriority = compareGroupsByEmergencyFill(left, right, now);
    if (emergencyPriority !== 0) return emergencyPriority;

    if (sortMode === 'distance') {
      return compareByDistance(left, right) || compareByTimeAsc(left, right);
    }

    if (sortMode === 'time_asc') {
      return compareByTimeAsc(left, right) || compareByFreshnessDesc(left, right);
    }

    if (sortMode === 'time_desc') {
      return compareByFreshnessDesc(left, right) || compareByTimeAsc(left, right);
    }

    const scoreDiff = getGroupRecommendationScore(right, { now, preferredPlayStyles })
      - getGroupRecommendationScore(left, { now, preferredPlayStyles });
    if (scoreDiff !== 0) return scoreDiff;

    return compareByTimeAsc(left, right) || compareByFreshnessDesc(left, right);
  });
}
