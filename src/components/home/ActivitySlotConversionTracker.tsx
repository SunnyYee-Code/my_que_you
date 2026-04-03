import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getActivityConversionStorageKey, getActivityIdFromSearch } from '@/lib/activity-slots';
import { useActivitySlots } from '@/hooks/useActivitySlots';
import { useCity } from '@/contexts/CityContext';

export default function ActivitySlotConversionTracker() {
  const location = useLocation();
  const { currentCity } = useCity();
  const { trackActivityEvent } = useActivitySlots(currentCity.id, [currentCity.name]);

  useEffect(() => {
    const activityId = getActivityIdFromSearch(location.search);
    if (!activityId || typeof window === 'undefined') return;

    const storageKey = getActivityConversionStorageKey(activityId, location.pathname);
    if (window.sessionStorage.getItem(storageKey)) return;

    void trackActivityEvent(activityId, 'conversion')
      .then(() => {
        window.sessionStorage.setItem(storageKey, '1');
      })
      .catch(() => undefined);
  }, [location.pathname, location.search, trackActivityEvent]);

  return null;
}
