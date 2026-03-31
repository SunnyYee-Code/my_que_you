import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from '@/pages/Admin';

const toastMock = vi.fn();
const navigateMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const invalidateBannedWordsCacheMock = vi.fn();
const supabaseCalls: Array<{ table: string; action: string; payload?: any }> = [];

const authState = vi.hoisted(() => ({ user: { id: 'admin-1' }, isSuperAdmin: true }));
const cityState = vi.hoisted(() => ({ allCities: [{ id: 'chengdu', name: '成都' }, { id: 'hangzhou', name: '杭州' }] }));
const queryState = vi.hoisted(() => ({
  profiles: [{ id: 'u1', nickname: '牌友A', phone: '13800138000', created_at: '2026-03-25T00:00:00Z' }],
  userRoles: [{ user_id: 'u1', role: 'user' }],
  groupsFull: [{ id: 'g1', address: '天府广场店', status: 'OPEN', host: { id: 'u1', nickname: '牌友A' }, members: [{ user_id: 'u1' }] }],
  playStyles: [{ id: 'ps1', name: '血战到底' }],
  reports: [{ id: 'r1', reporter: { nickname: '举报人' }, reported: { nickname: '被举报人' }, reason: '辱骂', created_at: '2026-03-25T00:00:00Z' }],
  reviews: [{ id: 'rv1', reviewer: { nickname: '评价人' }, target: { nickname: '被评价人' }, skill: 5, attitude: 4, punctuality: 5, comment: '不错', created_at: '2026-03-25T00:00:00Z' }],
  appeals: [{ id: 'ap1', user: { id: 'u2', nickname: '申诉人' }, reason: '误扣分', created_at: '2026-03-25T00:00:00Z', change: -3 }],
  exits: [{ id: 'ex1', user: { id: 'u3', nickname: '退出人' }, group: { id: 'g1', address: '天府广场店' }, exit_type: 'left', reason: '有事', credit_change: -3, created_at: '2026-03-25T00:00:00Z' }],
  chatGroups: [{ id: 'g1', address: '天府广场店', status: 'OPEN', host: { nickname: '牌友A' } }],
  inviteBindings: [
    {
      id: 'ib1',
      invite_code: 'HOST001',
      bound_at: '2026-03-31T09:30:00.000Z',
      inviter: { id: 'u1', nickname: '牌友A' },
      invitee: { id: 'u2', nickname: '新牌友' },
    },
  ],
  systemSettings: [{ key: 'leave_credit_deduction', value: '3' }, { key: 'kick_credit_deduction', value: '5' }],
  bannedWords: [{ id: 'bw1', word: '旧词' }],
}));

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn((table: string) => ({
    insert: vi.fn(async (payload: any) => {
      supabaseCalls.push({ table, action: 'insert', payload });
      return { error: null };
    }),
    delete: vi.fn(() => ({
      eq: vi.fn(async (field: string, value: any) => {
        supabaseCalls.push({ table, action: 'delete', payload: { [field]: value } });
        return { error: null };
      }),
    })),
    update: vi.fn((payload: any) => ({
      eq: vi.fn(async (field: string, value: any) => {
        supabaseCalls.push({ table, action: 'update', payload: { ...payload, [field]: value } });
        return { error: null };
      }),
    })),
    select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: { credit_score: 90 }, error: null })) })) })),
  })),
  functions: { invoke: vi.fn(async () => ({ data: { ok: true }, error: null })) },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/contexts/CityContext', () => ({ useCity: () => cityState }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMock }));
vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: any) => <span>{nickname}</span> }));
vi.mock('@/components/shared/CreditBadge', () => ({ default: ({ score }: any) => <span>信用{score}</span> }));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>加载中...</div> }));
vi.mock('@/lib/banned-words', () => ({ invalidateBannedWordsCache: invalidateBannedWordsCacheMock }));
vi.mock('@/components/ui/tabs', () => {
  const React = require('react');
  const Ctx = React.createContext({ value: 'users', setValue: (_v: string) => {} });
  return {
    Tabs: ({ value, onValueChange, children }: any) => <Ctx.Provider value={{ value, setValue: onValueChange }}>{children}</Ctx.Provider>,
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ value, children }: any) => {
      const ctx = React.useContext(Ctx);
      return <button role="tab" onClick={() => ctx.setValue(value)}>{children}</button>;
    },
    TabsContent: ({ value, children }: any) => {
      const ctx = React.useContext(Ctx);
      return ctx.value === value ? <div>{children}</div> : null;
    },
  };
});
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
    useQuery: ({ queryKey }: any) => {
      const map: Record<string, any> = {
        'admin-profiles': queryState.profiles,
        'admin-user-roles': queryState.userRoles,
        'admin-groups-full': queryState.groupsFull,
        'admin-play-styles': queryState.playStyles,
        'admin-reports': queryState.reports,
        'admin-reviews': queryState.reviews,
        'admin-appeals': queryState.appeals,
        'admin-exits': queryState.exits,
        'admin-chat-groups': queryState.chatGroups,
        'admin-invite-bindings': queryState.inviteBindings,
        'admin-system-settings': queryState.systemSettings,
        'admin-banned-words': queryState.bannedWords,
      };
      return { data: map[queryKey[0]] ?? [], isLoading: false };
    },
  };
});

globalThis.confirm = vi.fn(() => true) as any;

function renderPage() {
  return render(<MemoryRouter><AdminPage /></MemoryRouter>);
}

describe('AdminPage', () => {
  beforeEach(() => {
    toastMock.mockReset();
    navigateMock.mockReset();
    invalidateQueriesMock.mockReset();
    invalidateBannedWordsCacheMock.mockReset();
    supabaseCalls.length = 0;
  });

  it('adds and deletes cities from admin tab', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: '城市' }));
    const cityInput = screen.getByPlaceholderText('新增城市名称');
    await user.type(cityInput, '绵阳');
    await user.click(cityInput.parentElement!.querySelector('button') as HTMLButtonElement);

    await waitFor(() => expect(supabaseCalls.some((c) => c.table === 'cities' && c.action === 'insert' && c.payload.name === '绵阳')).toBe(true));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已添加城市: 绵阳' }));

    await user.click(screen.getByText('杭州').closest('div')!.parentElement!.querySelector('button') as HTMLButtonElement);
    await waitFor(() => expect(supabaseCalls.some((c) => c.table === 'cities' && c.action === 'delete' && c.payload.id === 'hangzhou')).toBe(true));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已删除: 杭州' }));
  });

  it('renders governance data across reports reviews appeals and exits tabs', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: '举报' }));
    expect(screen.getByText('举报人')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '评价' }));
    expect(screen.getByText('被评价人')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /申诉/ }));
    expect(screen.getByText('申诉人')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '退出记录' }));
    expect(screen.getByText('退出人')).toBeInTheDocument();
  });

  it('renders invite attribution data in admin tab', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: '邀请归因' }));

    expect(screen.getByText('HOST001')).toBeInTheDocument();
    expect(screen.getByText(/邀请人：牌友A/)).toBeInTheDocument();
    expect(screen.getByText(/新牌友/)).toBeInTheDocument();
    expect(screen.getByText('03-31 17:30')).toBeInTheDocument();
  });

  it('adds banned word and invalidates client cache', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: '设置' }));
    const bannedInput = screen.getByPlaceholderText('输入违禁词...');
    await user.type(bannedInput, '新词');
    await user.click(bannedInput.parentElement!.querySelector('button') as HTMLButtonElement);

    await waitFor(() => expect(supabaseCalls.some((c) => c.table === 'banned_words' && c.action === 'insert' && c.payload.word === '新词')).toBe(true));
    await waitFor(() => expect(invalidateBannedWordsCacheMock).toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已添加：新词' }));
  });
});
