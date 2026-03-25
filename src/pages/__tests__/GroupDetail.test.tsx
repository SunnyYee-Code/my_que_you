import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupDetailPage from '../GroupDetail';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const groupState = vi.hoisted(() => ({ data: null as any, isLoading: false }));
const authState = vi.hoisted(() => ({ user: { id: 'user-1' } as any }));
const supabaseCalls: Array<{ table: string; action: string; payload?: any }> = [];
const supabaseMock = vi.hoisted(() => ({
  from: vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ limit: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null })) })) })),
        })),
        single: vi.fn(async () => ({ data: { value: table === 'system_settings' ? '3' : '0' } })),
      })),
    })),
    insert: vi.fn(async (payload: any) => {
      supabaseCalls.push({ table, action: 'insert', payload });
      return { error: null };
    }),
    delete: vi.fn(() => ({
      eq: vi.fn((field1: string, value1: any) => ({
        eq: vi.fn(async (field2: string, value2: any) => {
          supabaseCalls.push({ table, action: 'delete', payload: { [field1]: value1, [field2]: value2 } });
          return { error: null };
        }),
      })),
    })),
    update: vi.fn((payload: any) => ({
      eq: vi.fn(async (field: string, value: any) => {
        supabaseCalls.push({ table, action: 'update', payload: { ...payload, [field]: value } });
        return { error: null };
      }),
    })),
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/shared/StatusBadge', () => ({ default: ({ status }: any) => <span>{status}</span> }));
vi.mock('@/components/shared/CreditBadge', () => ({ default: ({ score }: any) => <span>信用{score}</span> }));
vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: any) => <span>{nickname}</span> }));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>加载中...</div> }));
vi.mock('@/components/shared/ReportDialog', () => ({ default: () => <button>举报</button> }));
vi.mock('@/components/friends/AddFriendButton', () => ({ default: () => <button>加好友</button> }));
vi.mock('@/components/friends/InviteFriendsDialog', () => ({ default: () => <button>邀请好友</button> }));
vi.mock('@/hooks/useGroups', () => ({ useGroupDetail: () => groupState }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMock }));
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
    useQuery: ({ queryKey }: any) => {
      if (queryKey?.[0] === 'setting') return { data: queryKey[1] === 'leave_credit_deduction' ? 3 : 5 };
      return { data: null };
    },
  };
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/group/group-1']}>
        <Routes>
          <Route path="/group/:id" element={<GroupDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function buildGroup(overrides: any = {}) {
  const start = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 90 * 60 * 1000).toISOString();
  return {
    id: 'group-1',
    host_id: 'host-1',
    status: 'OPEN',
    address: '测试牌馆',
    latitude: 30.1,
    longitude: 104.1,
    start_time: start,
    end_time: end,
    total_slots: 4,
    needed_slots: 1,
    play_style: '血战到底',
    game_note: '禁烟',
    host: { id: 'host-1', nickname: '房主', credit_score: 98 },
    members: [
      { user_id: 'host-1', profiles: { nickname: '房主', credit_score: 98 } },
      { user_id: 'user-1', profiles: { nickname: '我', credit_score: 90 } },
      { user_id: 'user-2', profiles: { nickname: '成员A', credit_score: 80 } },
    ],
    ...overrides,
  };
}

describe('GroupDetailPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastMock.mockReset();
    invalidateQueriesMock.mockReset();
    supabaseCalls.length = 0;
    authState.user = { id: 'user-1' };
    groupState.data = buildGroup();
    groupState.isLoading = false;
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('submits join request for non-member user', async () => {
    authState.user = { id: 'outsider-1' };
    groupState.data = buildGroup({ members: [{ user_id: 'host-1', profiles: { nickname: '房主', credit_score: 98 } }] });
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '申请加入' }));
    await waitFor(() => expect(supabaseCalls.some(c => c.table === 'join_requests' && c.action === 'insert')).toBe(true));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '申请已提交' }));
  });

  it('requires leave reason within 60 minutes and deducts credit after leaving', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '退出拼团' }));
    const confirm = await screen.findByRole('button', { name: /仍然退出/ });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByPlaceholderText('请说明退出原因...'), '临时有事');
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() => expect(supabaseCalls.some(c => c.table === 'group_member_exits' && c.action === 'insert')).toBe(true));
    expect(supabaseCalls.some(c => c.table === 'credit_history' && c.action === 'insert')).toBe(true);
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已退出拼团' }));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '⚠️ 信用分已扣除' }));
  });

  it('lets host remove member with reason', async () => {
    authState.user = { id: 'host-1' };
    groupState.data = buildGroup();
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button').find(btn => btn.className.includes('text-destructive'))!);
    const confirm = await screen.findByRole('button', { name: '确认移除' });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByPlaceholderText('请说明移除原因...'), '多次迟到');
    await user.click(confirm);
    await waitFor(() => expect(supabaseCalls.some(c => c.table === 'group_member_exits' && c.action === 'insert' && c.payload.exit_type === 'kicked')).toBe(true));
    expect(supabaseCalls.some(c => c.table === 'notifications' && c.action === 'insert')).toBe(true);
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已移除成员' }));
  });

  it('opens amap marker navigation when coordinates exist', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /导航/ }));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('uri.amap.com/marker'), '_blank');
  });
});
