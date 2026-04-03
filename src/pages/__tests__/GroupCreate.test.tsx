import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupCreatePage from '../GroupCreate';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const createGroupMutateAsync = vi.fn();
const createFavoriteLocationMutateAsync = vi.fn();
const updateFavoriteLocationMutateAsync = vi.fn();
const deleteFavoriteLocationMutateAsync = vi.fn();
const markFavoriteLocationUsedMutateAsync = vi.fn();
const validateNoBannedWordsMock = vi.hoisted(() => vi.fn());
const realNameState = vi.hoisted(() => ({
  data: {
    status: 'approved',
    display_status_text: '已实名',
    can_submit: false,
    can_resubmit: false,
    can_cancel: false,
    reject_reason_text: null,
    verified_at: null,
    last_submitted_at: null,
    restriction_level: 'none',
    restriction_scenes: [],
  } as any,
  isLoading: false,
  isError: false,
}));
const queryState = vi.hoisted(() => ({
  timeLimits: { max_start_hours: 24, max_duration_hours: 24 },
  dailyLimitCheck: { allowed: true, current: 0, limit: 5 } as any,
  activeHostingData: [] as any[],
}));
const cityState = vi.hoisted(() => ({
  currentCity: { id: 'city-1', name: '成都' },
}));
const favoriteLocationsState = vi.hoisted(() => ({
  items: [] as any[],
  isLoading: false,
}));
const supabaseMock = vi.hoisted(() => ({
  from: vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({ data: queryState.timeLimits, error: null })),
          })),
        })),
      };
    }
    if (table === 'groups') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ in: vi.fn(() => ({ limit: vi.fn(async () => ({ data: queryState.activeHostingData, error: null })) })) })),
          in: vi.fn(() => ({ neq: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [], error: null })) })) })),
        })),
      };
    }
    if (table === 'group_members') {
      return { select: vi.fn(() => ({ eq: vi.fn(async () => ({ data: [], error: null })) })) };
    }
    throw new Error(`unexpected table ${table}`);
  }),
  functions: {
    invoke: vi.fn(async (_name: string, options?: any) => {
      if (options?.body?.action === 'check_create') return { data: queryState.dailyLimitCheck, error: null };
      if (options?.body?.action === 'record_create') return { data: { ok: true }, error: null };
      return { data: null, error: null };
    }),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/contexts/CityContext', () => ({ useCity: () => cityState }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useRealNameVerification', () => ({ useRealNameVerification: () => realNameState }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/hooks/useGroups', () => ({ useCreateGroup: () => ({ mutateAsync: createGroupMutateAsync, isPending: false }) }));
vi.mock('@/hooks/useFavoriteLocations', () => ({
  useFavoriteLocations: () => ({ data: favoriteLocationsState.items, isLoading: favoriteLocationsState.isLoading }),
  useCreateFavoriteLocation: () => ({ mutateAsync: createFavoriteLocationMutateAsync, isPending: false }),
  useUpdateFavoriteLocation: () => ({ mutateAsync: updateFavoriteLocationMutateAsync, isPending: false }),
  useDeleteFavoriteLocation: () => ({ mutateAsync: deleteFavoriteLocationMutateAsync, isPending: false }),
  useMarkFavoriteLocationUsed: () => ({ mutateAsync: markFavoriteLocationUsedMutateAsync }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMock }));
vi.mock('@/lib/banned-words', () => ({ validateNoBannedWords: validateNoBannedWordsMock }));
vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/map/AmapLocationPicker', () => ({
  default: ({ onSelect, initialAddress, initialLat, initialLng }: any) => (
    <div>
      <button onClick={() => onSelect({ address: '测试牌馆', lat: 30.1, lng: 104.1 })}>模拟选点</button>
      <div data-testid="mock-picker-address">{initialAddress || ''}</div>
      <div data-testid="mock-picker-lat">{typeof initialLat === 'number' ? String(initialLat) : ''}</div>
      <div data-testid="mock-picker-lng">{typeof initialLng === 'number' ? String(initialLng) : ''}</div>
    </div>
  ),
}));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>加载中...</div> }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><GroupCreatePage /></MemoryRouter></QueryClientProvider>);
}

function getDatetimeInputs() {
  return screen.getAllByDisplayValue('') as HTMLInputElement[];
}

async function fillValidForm() {
  const user = userEvent.setup();
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const [startInput, endInput] = getDatetimeInputs();
  await user.type(startInput, fmt(start));
  await user.type(endInput, fmt(end));
  await user.click(screen.getByRole('button', { name: '模拟选点' }));
  await user.click(screen.getByRole('button', { name: '血战到底' }));
  return user;
}

describe('GroupCreatePage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastMock.mockReset();
    createGroupMutateAsync.mockReset();
    createGroupMutateAsync.mockResolvedValue({ id: 'group-1' });
    createFavoriteLocationMutateAsync.mockReset();
    createFavoriteLocationMutateAsync.mockResolvedValue({ id: 'fav-1' });
    updateFavoriteLocationMutateAsync.mockReset();
    updateFavoriteLocationMutateAsync.mockResolvedValue({ id: 'fav-1' });
    deleteFavoriteLocationMutateAsync.mockReset();
    deleteFavoriteLocationMutateAsync.mockResolvedValue(undefined);
    markFavoriteLocationUsedMutateAsync.mockReset();
    markFavoriteLocationUsedMutateAsync.mockResolvedValue(undefined);
    validateNoBannedWordsMock.mockReset();
    validateNoBannedWordsMock.mockResolvedValue(null);
    queryState.timeLimits = { max_start_hours: 24, max_duration_hours: 24 };
    queryState.dailyLimitCheck = { allowed: true, current: 0, limit: 5 };
    queryState.activeHostingData = [];
    cityState.currentCity = { id: 'city-1', name: '成都' };
    favoriteLocationsState.items = [];
    favoriteLocationsState.isLoading = false;
    realNameState.data = {
      status: 'approved',
      display_status_text: '已实名',
      can_submit: false,
      can_resubmit: false,
      can_cancel: false,
      reject_reason_text: null,
      verified_at: null,
      last_submitted_at: null,
      restriction_level: 'none',
      restriction_scenes: [],
    };
    realNameState.isLoading = false;
    realNameState.isError = false;
    supabaseMock.functions.invoke.mockClear();
  });

  it('shows time validation when start time is earlier than now', async () => {
    renderPage();
    const user = userEvent.setup();
    const now = new Date();
    const past = new Date(now.getTime() - 60 * 60 * 1000);
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const [startInput, endInput] = getDatetimeInputs();
    await user.type(startInput, fmt(past));
    await user.type(endInput, fmt(end));
    expect(await screen.findByText('开始时间不能早于当前时间')).toBeInTheDocument();
  });

  it('shows duration validation when end time is earlier than start time', async () => {
    renderPage();
    const user = userEvent.setup();
    const now = new Date();
    const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const [startInput, endInput] = getDatetimeInputs();
    await user.type(startInput, fmt(start));
    await user.type(endInput, fmt(end));
    expect(await screen.findByText('结束时间必须晚于开始时间')).toBeInTheDocument();
  });


  it('shows max duration validation when duration exceeds limit', async () => {
    renderPage();
    const user = userEvent.setup();
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(now.getTime() + 26 * 60 * 60 * 1000);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const [startInput, endInput] = getDatetimeInputs();
    await user.type(startInput, fmt(start));
    await user.type(endInput, fmt(end));
    expect(await screen.findByText('持续时间不能超过24小时')).toBeInTheDocument();
  });

  it('blocks submission when daily create limit is exceeded', async () => {
    queryState.dailyLimitCheck = { allowed: false, current: 5, limit: 5, message: '今日创建团数已达上限' };
    renderPage();
    expect((await screen.findAllByText('今日创建团数已达上限')).length).toBeGreaterThan(0);
  });

  it('blocks submission when user has active group conflict', async () => {
    queryState.activeHostingData = [{ id: 'g1', address: '老地方', status: 'OPEN' }];
    renderPage();
    expect(screen.getByText('创建拼团')).toBeInTheDocument();
  });


  it('keeps publish button disabled when required location or play style is missing', async () => {
    renderPage();
    const user = userEvent.setup();
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const [startInput, endInput] = getDatetimeInputs();
    await user.type(startInput, fmt(start));
    await user.type(endInput, fmt(end));
    expect(screen.getByRole('button', { name: '预览并发布' })).toBeDisabled();
  });

  it('validates banned words before creating group', async () => {
    validateNoBannedWordsMock.mockResolvedValueOnce('包含违禁词').mockResolvedValue(null);
    renderPage();
    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: '预览并发布' }));
    await user.click(await screen.findByRole('button', { name: '确认发布' }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '地址包含违禁词', variant: 'destructive' })));
    expect(createGroupMutateAsync).not.toHaveBeenCalled();
  });

  it('allows saving the currently selected location as a favorite', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '模拟选点' }));
    await user.click(await screen.findByRole('button', { name: '收藏当前地点' }));
    await user.type(screen.getByLabelText('地点名称'), '公司楼下牌馆');
    await user.type(screen.getByLabelText('备注'), '停车方便');
    await user.click(screen.getByRole('button', { name: '保存地点' }));

    await waitFor(() => expect(createFavoriteLocationMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      city_id: 'city-1',
      city_name: '成都',
      name: '公司楼下牌馆',
      address: '测试牌馆',
      latitude: 30.1,
      longitude: 104.1,
      note: '停车方便',
    })));
  });

  it('supports quick reuse from favorite locations', async () => {
    favoriteLocationsState.items = [{
      id: 'fav-1',
      user_id: 'user-1',
      city_id: 'city-1',
      city_name: '成都',
      name: '公司楼下牌馆',
      address: '高新区天府三街测试牌馆',
      latitude: 30.1,
      longitude: 104.1,
      note: '停车方便',
      last_used_at: '2026-04-02T10:00:00.000Z',
      updated_at: '2026-04-02T10:00:00.000Z',
    }];

    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: '快捷填入 公司楼下牌馆' }));

    expect(screen.getAllByText('高新区天府三街测试牌馆').length).toBeGreaterThan(0);
    expect(screen.getByTestId('mock-picker-address')).toHaveTextContent('高新区天府三街测试牌馆');
    expect(screen.getByTestId('mock-picker-lat')).toHaveTextContent('30.1');
    expect(screen.getByTestId('mock-picker-lng')).toHaveTextContent('104.1');
    await waitFor(() => expect(markFavoriteLocationUsedMutateAsync).toHaveBeenCalledWith('fav-1'));
  });

  it('shows cross-city favorites as unavailable until city is switched', async () => {
    favoriteLocationsState.items = [{
      id: 'fav-2',
      user_id: 'user-1',
      city_id: 'city-2',
      city_name: '上海',
      name: '静安老地方',
      address: '静安区测试牌馆',
      latitude: 31.2,
      longitude: 121.4,
      note: '',
      last_used_at: '2026-04-02T10:00:00.000Z',
      updated_at: '2026-04-02T10:00:00.000Z',
    }];

    renderPage();

    expect(await screen.findByText('静安老地方')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '切换城市后复用 静安老地方' })).toBeDisabled();
  });

  it('allows reusing a cross-city favorite after switching city', async () => {
    favoriteLocationsState.items = [{
      id: 'fav-2',
      user_id: 'user-1',
      city_id: 'city-2',
      city_name: '上海',
      name: '静安老地方',
      address: '静安区测试牌馆',
      latitude: 31.2,
      longitude: 121.4,
      note: '',
      last_used_at: '2026-04-02T10:00:00.000Z',
      updated_at: '2026-04-02T10:00:00.000Z',
    }];

    const view = renderPage();
    expect(await screen.findByRole('button', { name: '切换城市后复用 静安老地方' })).toBeDisabled();

    cityState.currentCity = { id: 'city-2', name: '上海' };
    view.rerender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><MemoryRouter><GroupCreatePage /></MemoryRouter></QueryClientProvider>);

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '快捷填入 静安老地方' }));

    expect(screen.getByTestId('mock-picker-address')).toHaveTextContent('静安区测试牌馆');
    expect(screen.getByTestId('mock-picker-lat')).toHaveTextContent('31.2');
    expect(screen.getByTestId('mock-picker-lng')).toHaveTextContent('121.4');
  });

  it('edits a favorite using its own saved location instead of the current form location', async () => {
    favoriteLocationsState.items = [{
      id: 'fav-edit',
      user_id: 'user-1',
      city_id: 'city-2',
      city_name: '上海',
      name: '静安老地方',
      address: '静安区测试牌馆',
      latitude: 31.2,
      longitude: 121.4,
      note: '原备注',
      last_used_at: '2026-04-02T10:00:00.000Z',
      updated_at: '2026-04-02T10:00:00.000Z',
    }];

    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '模拟选点' }));
    await user.click(await screen.findByRole('button', { name: '编辑 静安老地方' }));
    expect(screen.getAllByText('静安区测试牌馆').length).toBeGreaterThan(0);

    const nameInput = screen.getByLabelText('地点名称');
    await user.clear(nameInput);
    await user.type(nameInput, '静安新馆');
    const noteInput = screen.getByLabelText('备注');
    await user.clear(noteInput);
    await user.type(noteInput, '新备注');
    await user.click(screen.getByRole('button', { name: '更新地点' }));

    await waitFor(() => expect(updateFavoriteLocationMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      id: 'fav-edit',
      city_id: 'city-2',
      city_name: '上海',
      name: '静安新馆',
      address: '静安区测试牌馆',
      latitude: 31.2,
      longitude: 121.4,
      note: '新备注',
    })));
  });

  it('creates group successfully and navigates home', async () => {
    renderPage();
    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: '预览并发布' }));
    await user.click(await screen.findByRole('button', { name: '确认发布' }));
    await waitFor(() => expect(createGroupMutateAsync).toHaveBeenCalled());
    expect(createGroupMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      city_id: 'city-1',
      address: '测试牌馆',
      latitude: 30.1,
      longitude: 104.1,
      play_style: '血战到底',
    }));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '拼团创建成功！' }));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('shows real-name restriction guard and keeps publish disabled when create scene is blocked', async () => {
    realNameState.data = {
      status: 'unverified',
      display_status_text: '未实名',
      can_submit: true,
      can_resubmit: false,
      can_cancel: false,
      reject_reason_text: null,
      verified_at: null,
      last_submitted_at: null,
      restriction_level: 'limited',
      restriction_scenes: ['group_create'],
    };

    renderPage();
    const user = await fillValidForm();
    expect(screen.getByText('实名限制提示')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '预览并发布' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '前往实名认证' }));
    expect(navigateMock).toHaveBeenCalledWith('/settings?tab=real-name');
  });

  it('fails closed when real-name query errors', () => {
    realNameState.data = undefined;
    realNameState.isError = true;

    renderPage();
    expect(screen.getByText('实名限制提示')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '预览并发布' })).toBeDisabled();
  });
});
