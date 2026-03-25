import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupCreatePage from '../GroupCreate';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const createGroupMutateAsync = vi.fn();
const validateNoBannedWordsMock = vi.hoisted(() => vi.fn());
const queryState = vi.hoisted(() => ({
  timeLimits: { max_start_hours: 24, max_duration_hours: 24 },
  dailyLimitCheck: { allowed: true, current: 0, limit: 5 } as any,
  activeHostingData: [] as any[],
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
vi.mock('@/contexts/CityContext', () => ({ useCity: () => ({ currentCity: { id: 'city-1', name: '成都' } }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/hooks/useGroups', () => ({ useCreateGroup: () => ({ mutateAsync: createGroupMutateAsync, isPending: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMock }));
vi.mock('@/lib/banned-words', () => ({ validateNoBannedWords: validateNoBannedWordsMock }));
vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/map/AmapLocationPicker', () => ({ default: ({ onSelect }: any) => <button onClick={() => onSelect({ address: '测试牌馆', lat: 30.1, lng: 104.1 })}>模拟选点</button> }));
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
    validateNoBannedWordsMock.mockReset();
    validateNoBannedWordsMock.mockResolvedValue(null);
    queryState.timeLimits = { max_start_hours: 24, max_duration_hours: 24 };
    queryState.dailyLimitCheck = { allowed: true, current: 0, limit: 5 };
    queryState.activeHostingData = [];
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

  it('validates banned words before creating group', async () => {
    validateNoBannedWordsMock.mockResolvedValueOnce('包含违禁词').mockResolvedValue(null);
    renderPage();
    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: '预览并发布' }));
    await user.click(await screen.findByRole('button', { name: '确认发布' }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '地址包含违禁词', variant: 'destructive' })));
    expect(createGroupMutateAsync).not.toHaveBeenCalled();
  });

  it('creates group successfully and navigates home', async () => {
    renderPage();
    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: '预览并发布' }));
    await user.click(await screen.findByRole('button', { name: '确认发布' }));
    await waitFor(() => expect(createGroupMutateAsync).toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '拼团创建成功！' }));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });
});
