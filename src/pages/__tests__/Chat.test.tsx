import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatPage from '../Chat';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const validateNoBannedWordsMock = vi.hoisted(() => vi.fn());
const mutateAsyncMock = vi.fn();
const groupState = vi.hoisted(() => ({ data: null as any, isLoading: false }));
const messagesState = vi.hoisted(() => ({ data: [] as any[], isLoading: false }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: any) => <span>{nickname}</span> }));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>加载中...</div> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useGroups', () => ({ useGroupDetail: () => groupState }));
vi.mock('@/hooks/useMessages', () => ({ useMessages: () => messagesState, useSendMessage: () => ({ mutateAsync: mutateAsyncMock }) }));
vi.mock('@/lib/banned-words', () => ({ validateNoBannedWords: validateNoBannedWordsMock }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/group/group-1/chat']}>
      <Routes><Route path="/group/:id/chat" element={<ChatPage />} /></Routes>
    </MemoryRouter>
  );
}

describe('ChatPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastMock.mockReset();
    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockResolvedValue({});
    validateNoBannedWordsMock.mockReset();
    validateNoBannedWordsMock.mockResolvedValue(null);
    groupState.data = {
      id: 'group-1',
      host_id: 'host-1',
      members: [{ user_id: 'user-1', profiles: { nickname: '我' } }, { user_id: 'host-1', profiles: { nickname: '房主' } }],
    };
    groupState.isLoading = false;
    messagesState.data = [{ id: 'm1', sender_id: 'host-1', content: '欢迎', created_at: new Date().toISOString(), sender: { nickname: '房主' } }];
    messagesState.isLoading = false;
  });

  it('sends normal group chat message', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('输入消息...'), '大家好');
    await user.click(screen.getAllByRole('button').at(-1)!);
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledWith({ groupId: 'group-1', content: '大家好' }));
  });

  it('blocks banned words in group chat', async () => {
    validateNoBannedWordsMock.mockResolvedValue('包含违禁词');
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('输入消息...'), '坏词');
    await user.click(screen.getAllByRole('button').at(-1)!);
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '包含违禁词', variant: 'destructive' }));
  });
});
