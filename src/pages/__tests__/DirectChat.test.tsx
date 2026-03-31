import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DirectChatPage from '../DirectChat';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const validateNoBannedWordsMock = vi.hoisted(() => vi.fn());
const sendMessageMock = vi.fn();
const directState = vi.hoisted(() => ({ data: [] as any[], isLoading: false }));
const profileState = vi.hoisted(() => ({ data: { id: 'friend-1', nickname: '好友' }, isLoading: false }));
const blacklistStatusState = vi.hoisted(() => ({
  data: {
    isBlocked: false,
    relationship: 'none',
    blockedByUserId: null,
    reason: '',
  },
}));
const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null })) })),
        maybeSingle: vi.fn(async () => ({ data: null })),
        order: vi.fn(() => ({ limit: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null })) })) })),
        single: vi.fn(async () => ({ data: { host_id: 'host-1' } })),
      })),
    })),
    insert: vi.fn(async () => ({ error: null })),
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: any) => <span>{nickname}</span> }));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>加载中...</div> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfileById: () => profileState }));
vi.mock('@/hooks/useDirectMessages', () => ({
  useDirectMessages: () => directState,
  useSendDirectMessage: () => ({ mutateAsync: sendMessageMock }),
  useMarkDMsRead: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/hooks/useBlacklist', () => ({
  useBlacklistStatus: () => blacklistStatusState,
}));
vi.mock('@/lib/banned-words', () => ({ validateNoBannedWords: validateNoBannedWordsMock }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMock }));
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return { ...actual, useQuery: () => ({ data: null }), useMutation: ({ mutationFn }: any) => ({ mutate: mutationFn, mutateAsync: mutationFn }), useQueryClient: () => ({ invalidateQueries: vi.fn() }) };
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/dm/friend-1']}>
        <Routes><Route path="/dm/:friendId" element={<DirectChatPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DirectChatPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastMock.mockReset();
    sendMessageMock.mockReset();
    sendMessageMock.mockResolvedValue({});
    validateNoBannedWordsMock.mockReset();
    validateNoBannedWordsMock.mockResolvedValue(null);
    directState.data = [{ id: 'm1', sender_id: 'friend-1', content: '你好', created_at: new Date().toISOString(), type: 'text' }];
    directState.isLoading = false;
    profileState.data = { id: 'friend-1', nickname: '好友' };
    profileState.isLoading = false;
    blacklistStatusState.data = {
      isBlocked: false,
      relationship: 'none',
      blockedByUserId: null,
      reason: '',
    };
  });

  it('sends direct message successfully', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('输入消息...'), '你好呀');
    await user.click(screen.getAllByRole('button').at(-1)!);
    await waitFor(() => expect(sendMessageMock).toHaveBeenCalledWith({ receiverId: 'friend-1', content: '你好呀' }));
  });

  it('blocks banned words before sending direct message', async () => {
    validateNoBannedWordsMock.mockResolvedValue('包含违禁词');
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('输入消息...'), '敏感');
    await user.click(screen.getAllByRole('button').at(-1)!);
    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '包含违禁词', variant: 'destructive' }));
  });

  it('shows blacklist guard and blocks sending when interaction is blocked', async () => {
    blacklistStatusState.data = {
      isBlocked: true,
      relationship: 'blocked_by_me',
      blockedByUserId: 'user-1',
      reason: '你已将对方加入黑名单，当前无法继续互动',
    };

    renderPage();

    expect(screen.getByText('你已将对方加入黑名单，当前无法继续互动')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('输入消息...')).toBeDisabled();
  });

  it('renders host invite card and enter button for approved invitation', async () => {
    directState.data = [{
      id: 'invite-1',
      sender_id: 'friend-1',
      content: '邀请你来',
      created_at: new Date().toISOString(),
      type: 'group_invite',
      metadata: {
        group_id: 'group-1',
        inviter_name: '好友',
        group_address: '天府店',
        group_start_time: '2026-03-26T10:00:00+08:00',
        total_slots: 4,
        needed_slots: 1,
        is_host_invite: true,
      },
    }];
    renderPage();
    expect(await screen.findByText('房主邀请你加入')).toBeInTheDocument();
    expect(screen.getByText('天府店')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看拼团' })).toBeInTheDocument();
  });
});
