import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '../Home';

const mockNavigate = vi.fn();
const mockRequestLocation = vi.fn();
const mockTrackActivityEvent = vi.fn();
const mockMarkSlotImpressionSeen = vi.fn();

let currentUser: { id: string } | null = { id: 'user-1' };
let currentCity = { id: 'hz', name: '杭州' };
let groupsData: Array<Record<string, unknown>> = [];
let myGroupsData = { hosted: [], joined: [] as Array<Record<string, unknown>> };
let positionData: { lat: number; lng: number } | null = null;
let geoError = '';
let activitySlots: Array<Record<string, unknown>> = [];
const windowOpenMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/home/HomeNavBar', () => ({ default: () => <div>nav</div> }));
vi.mock('@/components/home/HomeFooter', () => ({ default: () => <div>footer</div> }));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>loading...</div> }));
vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: { nickname: string }) => <span>{nickname}</span> }));
vi.mock('@/components/shared/CreditBadge', () => ({ default: ({ score }: { score: number }) => <span>信用{score}</span> }));

vi.mock('@/contexts/CityContext', () => ({
  useCity: () => ({ currentCity }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}));

vi.mock('@/hooks/useGroups', () => ({
  useGroupsByCity: () => ({ data: groupsData, isLoading: false }),
  useMyGroups: () => ({ data: myGroupsData, isLoading: false }),
}));

vi.mock('@/hooks/useGeolocation', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useGeolocation')>('@/hooks/useGeolocation');
  return {
    ...actual,
    useGeolocation: () => ({
      position: positionData,
      loading: false,
      error: geoError,
      requestLocation: mockRequestLocation,
    }),
  };
});

vi.mock('@/hooks/useActivitySlots', () => ({
  useActivitySlots: () => ({
    slots: activitySlots,
    trackActivityEvent: mockTrackActivityEvent,
    markSlotImpressionSeen: mockMarkSlotImpressionSeen,
  }),
}));

function makeGroup(overrides: Record<string, unknown>) {
  return {
    id: overrides.id ?? 'group-1',
    host_id: overrides.host_id ?? 'host-1',
    address: overrides.address ?? overrides.id,
    start_time: overrides.start_time ?? new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    status: overrides.status ?? 'OPEN',
    latitude: overrides.latitude !== undefined ? overrides.latitude : 30.2741,
    longitude: overrides.longitude !== undefined ? overrides.longitude : 120.1551,
    needed_slots: overrides.needed_slots ?? 2,
    total_slots: overrides.total_slots ?? 4,
    play_style: overrides.play_style ?? null,
    host: { nickname: overrides.hostName ?? '房主A', credit_score: 88 },
    members: overrides.members ?? [],
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    currentUser = { id: 'user-1' };
    currentCity = { id: 'hz', name: '杭州' };
    positionData = null;
    geoError = '';
    activitySlots = [];
    mockTrackActivityEvent.mockReset();
    mockTrackActivityEvent.mockResolvedValue(undefined);
    mockMarkSlotImpressionSeen.mockReset();
    windowOpenMock.mockReset();
    vi.stubGlobal('open', windowOpenMock);
    myGroupsData = {
      hosted: [],
      joined: [makeGroup({ id: 'history-completed', status: 'COMPLETED', play_style: '血战到底', members: [{ user_id: 'user-1' }] })],
    };
    groupsData = [
      makeGroup({
        id: 'other-style',
        address: '首页非偏好局',
        play_style: '血流成河',
        latitude: 30.2745,
        longitude: 120.1555,
        start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      }),
      makeGroup({
        id: 'preferred-style',
        address: '首页偏好玩法局',
        play_style: '血战到底',
        latitude: 30.285,
        longitude: 120.165,
        start_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }),
    ];
  });

  it('requests location on mount when preview groups need recommended ranking', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockRequestLocation).toHaveBeenCalled();
    });
  });

  it('does not retry location automatically after geolocation error is present', () => {
    geoError = '请允许定位权限';
    renderPage();

    expect(mockRequestLocation).not.toHaveBeenCalled();
  });

  it('boosts preferred play style in preview groups using my-groups history', () => {
    positionData = { lat: 30.2741, lng: 120.1551 };
    renderPage();

    const preferred = screen.getByText('首页偏好玩法局');
    const other = screen.getByText('首页非偏好局');

    expect(preferred.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders homepage activity slots, tracks impression, and navigates with tracked internal link', async () => {
    activitySlots = [{
      id: 'activity-1',
      title: '清明同城主题赛',
      subtitle: '限时奖励翻倍',
      image_url: 'https://example.com/activity.png',
      link_url: '/group/create?q=1',
      cta_text: '立即参与',
    }];

    renderPage();

    expect(screen.getByText('清明同城主题赛')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockTrackActivityEvent).toHaveBeenCalledWith('activity-1', 'impression');
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '立即参与' }));

    expect(mockTrackActivityEvent).toHaveBeenCalledWith('activity-1', 'click');
    expect(mockNavigate).toHaveBeenCalledWith('/group/create?q=1&qy_activity_id=activity-1');
  });

  it('still navigates when click tracking fails', async () => {
    activitySlots = [{
      id: 'activity-2',
      title: '失败兜底活动',
      image_url: 'https://example.com/activity.png',
      link_url: '/community',
      cta_text: '去看看',
    }];
    mockTrackActivityEvent.mockImplementation((slotId: string, event: string) => {
      if (slotId === 'activity-2' && event === 'click') {
        return Promise.reject(new Error('track failed'));
      }
      return Promise.resolve(undefined);
    });

    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '去看看' }));

    expect(mockNavigate).toHaveBeenCalledWith('/community?qy_activity_id=activity-2');
  });

  it('opens external activity links and records click plus conversion without in-app navigation', async () => {
    activitySlots = [{
      id: 'activity-external',
      title: '外部活动页',
      image_url: 'https://example.com/activity.png',
      link_url: 'https://example.com/landing?foo=1',
      cta_text: '立即前往',
    }];

    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '立即前往' }));

    expect(windowOpenMock).toHaveBeenCalledWith(
      'https://example.com/landing?foo=1&qy_activity_id=activity-external',
      '_blank',
      'noopener,noreferrer',
    );
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('activity-external'));
    expect(mockTrackActivityEvent).toHaveBeenCalledWith('activity-external', 'click');
    expect(mockTrackActivityEvent).toHaveBeenCalledWith('activity-external', 'conversion');
  });
});
