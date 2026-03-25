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
});
