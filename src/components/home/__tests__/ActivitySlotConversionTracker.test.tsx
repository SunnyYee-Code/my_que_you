import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActivitySlotConversionTracker from '@/components/home/ActivitySlotConversionTracker';

const mockTrackActivityEvent = vi.fn();

let currentCity = { id: 'hz', name: '杭州' };

vi.mock('@/contexts/CityContext', () => ({
  useCity: () => ({ currentCity }),
}));

vi.mock('@/hooks/useActivitySlots', () => ({
  useActivitySlots: () => ({
    trackActivityEvent: mockTrackActivityEvent,
  }),
}));

function renderTracker(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ActivitySlotConversionTracker />
    </MemoryRouter>,
  );
}

describe('ActivitySlotConversionTracker', () => {
  beforeEach(() => {
    currentCity = { id: 'hz', name: '杭州' };
    mockTrackActivityEvent.mockReset();
    mockTrackActivityEvent.mockResolvedValue(undefined);
    window.sessionStorage.clear();
  });

  it('tracks conversion once when landing with activity id', async () => {
    renderTracker(['/group/create?qy_activity_id=slot-1']);

    await waitFor(() => {
      expect(mockTrackActivityEvent).toHaveBeenCalledWith('slot-1', 'conversion');
    });
  });

  it('does not track conversion when activity id is missing', async () => {
    renderTracker(['/group/create']);

    await waitFor(() => {
      expect(mockTrackActivityEvent).not.toHaveBeenCalled();
    });
  });

  it('deduplicates repeated conversion tracking on the same pathname within one session', async () => {
    const view = renderTracker(['/group/create?qy_activity_id=slot-1']);

    await waitFor(() => {
      expect(mockTrackActivityEvent).toHaveBeenCalledTimes(1);
    });

    view.rerender(
      <MemoryRouter initialEntries={['/group/create?qy_activity_id=slot-1']}>
        <ActivitySlotConversionTracker />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockTrackActivityEvent).toHaveBeenCalledTimes(1);
    });
  });

  it('allows conversion tracking for the same activity on a different pathname', async () => {
    const first = renderTracker(['/group/create?qy_activity_id=slot-1']);

    await waitFor(() => {
      expect(mockTrackActivityEvent).toHaveBeenCalledTimes(1);
    });

    first.unmount();

    renderTracker(['/community?qy_activity_id=slot-1']);

    await waitFor(() => {
      expect(mockTrackActivityEvent).toHaveBeenCalledTimes(2);
    });
  });
});
