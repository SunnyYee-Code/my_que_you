export const MAX_FAVORITE_LOCATIONS = 10;

export interface FavoriteLocationRecord {
  id: string;
  user_id: string;
  city_id: string;
  city_name: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

export interface FavoriteLocationPayload {
  city_id: string;
  city_name: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  note?: string;
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

type FavoriteLocationReuseCandidate = Pick<FavoriteLocationRecord, 'address' | 'city_id' | 'city_name'> & {
  latitude: number | null;
  longitude: number | null;
};

function hasUsableCoordinates(location: Pick<FavoriteLocationReuseCandidate, 'latitude' | 'longitude'>) {
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
}

export function getFavoriteLocationReuseState(location: FavoriteLocationReuseCandidate, currentCityId: string) {
  if (!location.address.trim() || !hasUsableCoordinates(location)) {
    return {
      canReuse: false,
      reason: '地点信息不完整，请编辑后再复用',
    };
  }

  if (location.city_id !== currentCityId) {
    return {
      canReuse: false,
      reason: `切换到${location.city_name}后可复用`,
    };
  }

  return {
    canReuse: true,
    reason: '',
  };
}

export function sortFavoriteLocations(locations: FavoriteLocationRecord[], currentCityId: string) {
  return [...locations].sort((left, right) => {
    const leftReusable = getFavoriteLocationReuseState(left, currentCityId).canReuse ? 1 : 0;
    const rightReusable = getFavoriteLocationReuseState(right, currentCityId).canReuse ? 1 : 0;
    if (leftReusable !== rightReusable) return rightReusable - leftReusable;

    const leftCurrentCity = left.city_id === currentCityId ? 1 : 0;
    const rightCurrentCity = right.city_id === currentCityId ? 1 : 0;
    if (leftCurrentCity !== rightCurrentCity) return rightCurrentCity - leftCurrentCity;

    const lastUsedDiff = toTimestamp(right.last_used_at) - toTimestamp(left.last_used_at);
    if (lastUsedDiff !== 0) return lastUsedDiff;

    const updatedDiff = toTimestamp(right.updated_at) - toTimestamp(left.updated_at);
    if (updatedDiff !== 0) return updatedDiff;

    return left.name.localeCompare(right.name, 'zh-CN');
  });
}
