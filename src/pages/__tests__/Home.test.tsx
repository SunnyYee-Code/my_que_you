import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '../Home';

const mockNavigate = vi.fn();
const mockRequestLocation = vi.fn();

let currentUser: { id: string } | null = { id: 'user-1' };
let currentCity = { id: 'hz', name: '杭州' };
let groupsData: Array<Record<string, unknown>> = [];
let myGroupsData = { hosted: [], joined: [] as Array<Record<string, unknown>> };
let positionData: { lat: number; lng: number } | null = null;
let geoError = '';

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
});
