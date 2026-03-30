import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IndexPage from '../Index';

const mockNavigate = vi.fn();
const mockToast = vi.fn();
const mockQuickJoinMutate = vi.fn();
const mockRequestLocation = vi.fn();

let currentUser: any = { id: 'user-1' };
let currentCity = { id: 'hz', name: '杭州' };
let groupsData: any[] = [];
let positionData: any = null;
let geoError = '';
let geoLoading = false;
let joinStatuses: Record<string, any> = {};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/layout/CitySearchSelect', () => ({ default: () => <div data-testid="city-select" /> }));
vi.mock('@/components/shared/StatusBadge', () => ({ default: ({ status }: any) => <span>{status}</span> }));
vi.mock('@/components/shared/CreditBadge', () => ({ default: ({ score }: any) => <span>信用{score}</span> }));
vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: any) => <span>{nickname}</span> }));
vi.mock('@/components/shared/EmptyState', () => ({ default: ({ title, description }: any) => <div>{title}-{description}</div> }));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>loading...</div> }));

vi.mock('@/contexts/CityContext', () => ({
  useCity: () => ({ currentCity }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}));

vi.mock('@/hooks/useGroups', () => ({
  useGroupsByCity: () => ({
    data: groupsData,
    isLoading: false,
    refetch: vi.fn(),
    isFetching: false,
  }),
}));

vi.mock('@/hooks/useJoinGroup', () => ({
  useGroupJoinStatuses: () => ({ data: joinStatuses }),
  useQuickJoin: () => ({ mutate: mockQuickJoinMutate, isPending: false }),
}));

vi.mock('@/hooks/useGeolocation', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useGeolocation')>('@/hooks/useGeolocation');
  return {
    ...actual,
    useGeolocation: () => ({
      position: positionData,
      loading: geoLoading,
      error: geoError,
      requestLocation: mockRequestLocation,
    }),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

function makeGroup(overrides: Record<string, any>) {
  return {
    id: overrides.id,
    host_id: overrides.host_id ?? 'host-1',
    address: overrides.address ?? overrides.id,
    start_time: overrides.start_time ?? '2026-03-26T10:00:00+08:00',
    status: overrides.status ?? 'OPEN',
    latitude: overrides.latitude !== undefined ? overrides.latitude : 30.2741,
    longitude: overrides.longitude !== undefined ? overrides.longitude : 120.1551,
    needed_slots: overrides.needed_slots ?? 2,
    total_slots: overrides.total_slots ?? 4,
    host: { nickname: overrides.hostName ?? '房主A' },
    members: overrides.members ?? [],
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <IndexPage />
    </MemoryRouter>,
  );
}

describe('IndexPage', () => {
  beforeEach(() => {
    currentUser = { id: 'user-1' };
    currentCity = { id: 'hz', name: '杭州' };
    positionData = { lat: 30.2741, lng: 120.1551 };
    geoError = '';
    geoLoading = false;
    joinStatuses = {};
    groupsData = [
      makeGroup({ id: 'open-near', address: '近处招募中', latitude: 30.2741, longitude: 120.1551, start_time: '2026-03-26T09:00:00+08:00' }),
      makeGroup({ id: 'open-far', address: '远处招募中', latitude: 30.35, longitude: 120.35, start_time: '2026-03-26T11:00:00+08:00' }),
      makeGroup({ id: 'full-self', address: '自己可见满员局', status: 'FULL', members: [{ user_id: 'user-1' }] }),
      makeGroup({ id: 'full-other', address: '别人满员局', status: 'FULL', members: [{ user_id: 'other' }] }),
      makeGroup({ id: 'progress-host', address: '自己主持进行中', status: 'IN_PROGRESS', host_id: 'user-1' }),
      makeGroup({ id: 'completed', address: '已完成局', status: 'COMPLETED' }),
      makeGroup({ id: 'cancelled', address: '已取消局', status: 'CANCELLED' }),
      makeGroup({ id: 'no-coord', address: '无坐标局', latitude: null, longitude: null, start_time: '2026-03-26T08:00:00+08:00' }),
    ];
  });

  it('filters completed/cancelled and hides FULL/IN_PROGRESS from non-members', () => {
    renderPage();

    expect(screen.getByText('近处招募中')).toBeInTheDocument();
    expect(screen.getByText('自己可见满员局')).toBeInTheDocument();
    expect(screen.getByText('自己主持进行中')).toBeInTheDocument();

    expect(screen.queryByText('已完成局')).not.toBeInTheDocument();
    expect(screen.queryByText('已取消局')).not.toBeInTheDocument();
    expect(screen.queryByText('别人满员局')).not.toBeInTheDocument();
  });

  it('applies distance filter to exclude far groups', async () => {
    renderPage();

    fireEvent.click(screen.getAllByRole('combobox')[0]);
    const listboxes = await screen.findAllByRole('listbox');
    fireEvent.click(within(listboxes[listboxes.length - 1]).getByText('1km内'));

    await waitFor(() => {
      expect(screen.getByText('近处招募中')).toBeInTheDocument();
      expect(screen.queryByText('远处招募中')).not.toBeInTheDocument();
    });
  });

  it('requests location when sorting by distance without position', async () => {
    positionData = null;
    renderPage();

    fireEvent.click(screen.getAllByRole('combobox')[1]);
    const listboxes = await screen.findAllByRole('listbox');
    fireEvent.click(within(listboxes[listboxes.length - 1]).getByText('距离最近'));

    await waitFor(() => {
      expect(mockRequestLocation).toHaveBeenCalled();
    });
  });

  it('sorts groups with missing distance to the bottom when sorting by distance', async () => {
    renderPage();

    fireEvent.click(screen.getAllByRole('combobox')[1]);
    const listboxes = await screen.findAllByRole('listbox');
    fireEvent.click(within(listboxes[listboxes.length - 1]).getByText('距离最近'));

    await waitFor(() => {
      const cards = Array.from(document.querySelectorAll('.animate-fade-in')) as HTMLElement[];
      expect(cards.at(-1)?.textContent).toContain('无坐标局');
    });
  });

  it('refreshes group list when city changes', () => {
    const { rerender } = render(
      <MemoryRouter>
        <IndexPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('近处招募中')).toBeInTheDocument();
    currentCity = { id: 'cd', name: '成都' };
    groupsData = [
      makeGroup({ id: 'chengdu-group', address: '成都牌局', latitude: 30.67, longitude: 104.06 }),
    ];

    rerender(
      <MemoryRouter>
        <IndexPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('成都牌局')).toBeInTheDocument();
    expect(screen.queryByText('近处招募中')).not.toBeInTheDocument();
  });

  it('shows toast when distance filter needs location but geolocation fails', async () => {
    positionData = null;
    geoError = '';
    const { rerender } = render(
      <MemoryRouter>
        <IndexPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('combobox')[0]);
    const listboxes = await screen.findAllByRole('listbox');
    fireEvent.click(within(listboxes[listboxes.length - 1]).getByText('3km内'));

    geoError = '定位权限被拒绝';
    rerender(
      <MemoryRouter>
        <IndexPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: '定位失败',
        description: '定位权限被拒绝',
        variant: 'destructive',
      }));
    });
  });

  it('prioritizes emergency fill groups and shows emergency entry cues', () => {
    groupsData = [
      makeGroup({
        id: 'normal-group',
        address: '普通招募局',
        start_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        needed_slots: 2,
      }),
      makeGroup({
        id: 'emergency-group',
        address: '紧急补位局',
        start_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        needed_slots: 1,
      }),
    ];

    renderPage();

    const cards = Array.from(document.querySelectorAll('.animate-fade-in')) as HTMLElement[];
    expect(cards[0]?.textContent).toContain('紧急补位局');
    expect(screen.getByText('紧急补位')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /立即补位/ })).toBeInTheDocument();
  });

  it('keeps joined and pending statuses higher priority than emergency fill action copy', () => {
    groupsData = [
      makeGroup({
        id: 'emergency-member',
        address: '紧急补位已加入',
        start_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        needed_slots: 1,
      }),
      makeGroup({
        id: 'emergency-pending',
        address: '紧急补位审核中',
        start_time: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
        needed_slots: 1,
      }),
    ];
    joinStatuses = {
      'emergency-member': { isMember: true, isPending: false },
      'emergency-pending': { isMember: false, isPending: true },
    };

    renderPage();

    expect(screen.getByRole('button', { name: '已加入' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '审核中' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '立即补位' })).not.toBeInTheDocument();
  });

  it('keeps guest join flow available even when group is in emergency fill state', async () => {
    currentUser = null;
    groupsData = [
      makeGroup({
        id: 'emergency-guest',
        address: '游客紧急补位局',
        start_time: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        needed_slots: 1,
      }),
    ];

    renderPage();
    const user = userEvent.setup();
    expect(screen.getByText('紧急补位')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '加入' }));

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
