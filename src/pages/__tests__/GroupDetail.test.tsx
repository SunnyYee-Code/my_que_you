import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupDetailPage from '../GroupDetail';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const clipboardWriteTextMock = vi.fn();
const navigatorShareMock = vi.fn();
const navigatorCanShareMock = vi.fn();
const createObjectURLMock = vi.fn(() => 'blob:poster');
const revokeObjectURLMock = vi.fn();
const anchorClickMock = vi.fn();
const execCommandMock = vi.fn(() => true);
const drawImageMock = vi.fn();
const originalCreateElement = document.createElement.bind(document);
const OriginalURL = URL;
const groupState = vi.hoisted(() => ({ data: null as any, isLoading: false }));
const authState = vi.hoisted(() => ({ user: { id: 'user-1' } as any }));
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
const supabaseCalls: Array<{ table: string; action: string; payload?: any }> = [];
const supabaseFailures = vi.hoisted(() => ({ byTableAction: {} as Record<string, string | null> }));
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
      const message = supabaseFailures.byTableAction[`${table}:insert`];
      return { error: message ? new Error(message) : null };
    }),
    delete: vi.fn(() => ({
      eq: vi.fn((field1: string, value1: any) => ({
        eq: vi.fn(async (field2: string, value2: any) => {
          supabaseCalls.push({ table, action: 'delete', payload: { [field1]: value1, [field2]: value2 } });
          const message = supabaseFailures.byTableAction[`${table}:delete`];
          return { error: message ? new Error(message) : null };
        }),
      })),
    })),
    update: vi.fn((payload: any) => ({
      eq: vi.fn(async (field: string, value: any) => {
        supabaseCalls.push({ table, action: 'update', payload: { ...payload, [field]: value } });
        const message = supabaseFailures.byTableAction[`${table}:update`];
        return { error: message ? new Error(message) : null };
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
vi.mock('@/hooks/useRealNameVerification', () => ({ useRealNameVerification: () => realNameState }));
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
    vi.restoreAllMocks();
    navigateMock.mockReset();
    toastMock.mockReset();
    invalidateQueriesMock.mockReset();
    supabaseCalls.length = 0;
    supabaseFailures.byTableAction = {};
    authState.user = { id: 'user-1' };
    groupState.data = buildGroup();
    groupState.isLoading = false;
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
    vi.spyOn(window, 'open').mockImplementation(() => null);
    clipboardWriteTextMock.mockReset();
    navigatorShareMock.mockReset();
    navigatorCanShareMock.mockReset();
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
    anchorClickMock.mockClear();
    execCommandMock.mockClear();
    drawImageMock.mockClear();
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock,
      },
    });
    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: navigatorShareMock,
    });
    Object.defineProperty(window.navigator, 'canShare', {
      configurable: true,
      value: navigatorCanShareMock,
    });
    class MockURL extends OriginalURL {
      static createObjectURL = createObjectURLMock;
      static revokeObjectURL = revokeObjectURLMock;
    }
    vi.stubGlobal('URL', MockURL);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', {
          value: anchorClickMock,
        });
      }
      if (tagName === 'canvas') {
        Object.defineProperty(element, 'getContext', {
          value: vi.fn(() => ({ drawImage: drawImageMock })),
        });
        Object.defineProperty(element, 'toBlob', {
          value: (callback: (blob: Blob | null) => void) => callback(new Blob(['png'], { type: 'image/png' })),
        });
      }
      return element as any;
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommandMock,
    });
    class MockImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      decoding = 'async';
      private _src = '';

      set src(value: string) {
        this._src = value;
        queueMicrotask(() => {
          this.onload?.();
        });
      }

      get src() {
        return this._src;
      }

      decode() {
        return Promise.resolve();
      }
    }
    vi.stubGlobal('Image', MockImage as unknown as typeof Image);
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


  it('renders group detail summary and members', () => {
    renderPage();
    expect(screen.getByText('测试牌馆')).toBeInTheDocument();
    expect(screen.getByText(/已入团成员 \(3\/4\)/)).toBeInTheDocument();
    expect(screen.getAllByText('房主').length).toBeGreaterThan(0);
    expect(screen.getAllByText('成员A').length).toBeGreaterThan(0);
    expect(screen.getByText('血战到底')).toBeInTheDocument();
  });

  it('shows emergency fill banner for near-term groups with open slots', () => {
    renderPage();

    expect(screen.getByText('紧急补位中')).toBeInTheDocument();
    expect(screen.getByText(/距开局/)).toBeInTheDocument();
  });

  it('opens share poster dialog and copies poster text', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '分享海报' }));

    expect(await screen.findByText('拼团分享海报')).toBeInTheDocument();
    expect(screen.getAllByText(/还差1人/).length).toBeGreaterThan(0);
    expect(screen.getByText('测试牌馆')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '复制文案' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '分享文案已复制' }));
    });
    if (clipboardWriteTextMock.mock.calls.length > 0) {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(expect.stringContaining('/group/group-1?from=poster'));
    }
  });

  it('shares poster with native share api when available', async () => {
    navigatorShareMock.mockResolvedValue(undefined);
    navigatorCanShareMock.mockReturnValue(true);
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '分享海报' }));
    await user.click(await screen.findByRole('button', { name: '系统分享' }));

    await waitFor(() => expect(navigatorShareMock).toHaveBeenCalledTimes(1));
    expect(navigatorShareMock).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining('房主'),
      text: expect.stringContaining('测试牌馆'),
      files: expect.any(Array),
    }));
    expect(createObjectURLMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '分享已发起' }));
  });

  it('falls back to text-only share when file sharing is unsupported', async () => {
    navigatorShareMock.mockResolvedValue(undefined);
    navigatorCanShareMock.mockReturnValue(false);
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '分享海报' }));
    await user.click(await screen.findByRole('button', { name: '系统分享' }));

    await waitFor(() => expect(navigatorShareMock).toHaveBeenCalledTimes(1));
    expect(navigatorShareMock).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining('房主'),
      text: expect.stringContaining('/group/group-1?from=poster'),
      url: expect.stringContaining('/group/group-1?from=poster'),
    }));
    expect(navigatorShareMock).not.toHaveBeenCalledWith(expect.objectContaining({
      files: expect.any(Array),
    }));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已降级为链接分享' }));
  });

  it('downloads poster file for local save', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '分享海报' }));
    await user.click(await screen.findByRole('button', { name: '保存海报' }));

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:poster');
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '海报已开始下载' }));
  });

  it('hides share poster action from non-members', () => {
    authState.user = { id: 'outsider-1' };
    groupState.data = buildGroup({ members: [{ user_id: 'host-1', profiles: { nickname: '房主', credit_score: 98 } }] });

    renderPage();

    expect(screen.queryByRole('button', { name: '分享海报' })).not.toBeInTheDocument();
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
    expect(
      supabaseCalls.some(
        c => c.table === 'notifications'
          && c.action === 'insert'
          && typeof c.payload?.content === 'string'
          && c.payload.content.includes('紧急补位'),
      ),
    ).toBe(true);
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

  it('treats notification failure after leave as warning instead of whole-flow failure', async () => {
    supabaseFailures.byTableAction['notifications:insert'] = 'notify failed';
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '退出拼团' }));
    await user.type(screen.getByPlaceholderText('请说明退出原因...'), '临时有事');
    await user.click(await screen.findByRole('button', { name: /仍然退出/ }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已退出拼团' }));
    });
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: '补位通知发送失败',
      variant: 'destructive',
    }));
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['group'] });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['groups'] });
  });

  it('shows emergency-fill toast after host removes member and group becomes urgent', async () => {
    authState.user = { id: 'host-1' };
    groupState.data = buildGroup();
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('button').find(btn => btn.className.includes('text-destructive'))!);
    await user.type(screen.getByPlaceholderText('请说明移除原因...'), '多次迟到');
    await user.click(await screen.findByRole('button', { name: '确认移除' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已移除成员' }));
    });
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已触发紧急补位' }));
  });

  it('opens amap marker navigation when coordinates exist', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /导航/ }));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('uri.amap.com/marker'), '_blank');
  });

  it('lets host cancel group', async () => {
    authState.user = { id: 'host-1' };
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '取消拼团' }));
    await user.click(await screen.findByRole('button', { name: '确认取消' }));
    await waitFor(() => expect(supabaseCalls.some(c => c.table === 'groups' && c.action === 'update' && c.payload.status === 'CANCELLED')).toBe(true));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '拼团已取消' }));
  });

  it('shows real-name guard and blocks join action when join scene is restricted', async () => {
    authState.user = { id: 'outsider-1' };
    groupState.data = buildGroup({ members: [{ user_id: 'host-1', profiles: { nickname: '房主', credit_score: 98 } }] });
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
      restriction_scenes: ['group_join'],
    };

    renderPage();
    expect(screen.getByText('实名限制提示')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '申请加入' })).toBeDisabled();
  });

  it('fails closed when real-name query errors for join scene', () => {
    authState.user = { id: 'outsider-1' };
    groupState.data = buildGroup({ members: [{ user_id: 'host-1', profiles: { nickname: '房主', credit_score: 98 } }] });
    realNameState.data = undefined;
    realNameState.isError = true;

    renderPage();
    expect(screen.getByText('实名限制提示')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '申请加入' })).toBeDisabled();
  });
});
