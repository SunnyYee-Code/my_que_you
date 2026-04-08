import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatPage from '../Chat';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const validateNoBannedWordsMock = vi.hoisted(() => vi.fn());
const mutateAsyncMock = vi.fn();
const locationMutateAsyncMock = vi.fn();
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
vi.mock('@/hooks/useMessages', () => ({
  useMessages: () => messagesState,
  useSendMessage: () => ({ mutateAsync: mutateAsyncMock, isPending: false }),
  useSendLocationMessage: () => ({ mutateAsync: locationMutateAsyncMock, isPending: false }),
}));
vi.mock('@/lib/banned-words', () => ({ validateNoBannedWords: validateNoBannedWordsMock }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/components/map/AmapLocationPicker', () => ({
  default: ({ onSelect }: any) => (
    <button onClick={() => onSelect({ address: '成都市武侯区测试路1号', lat: 30.65, lng: 104.06 })}>
      选择位置
    </button>
  ),
}));
vi.mock('@/components/chat/LocationMessageCard', () => ({
  default: ({ meta }: any) => <div data-testid="location-card">{meta.address}</div>,
}));

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
    locationMutateAsyncMock.mockReset();
    locationMutateAsyncMock.mockResolvedValue({});
    validateNoBannedWordsMock.mockReset();
    validateNoBannedWordsMock.mockResolvedValue(null);
    groupState.data = {
      id: 'group-1',
      host_id: 'host-1',
      members: [{ user_id: 'user-1', profiles: { nickname: '我' } }, { user_id: 'host-1', profiles: { nickname: '房主' } }],
    };
    groupState.isLoading = false;
    messagesState.data = [{ id: 'm1', sender_id: 'host-1', content: '欢迎', type: 'TEXT', metadata: null, created_at: new Date().toISOString(), sender: { nickname: '房主' } }];
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

  it('renders location message card for LOCATION type messages', () => {
    messagesState.data = [{
      id: 'm2',
      sender_id: 'host-1',
      content: '[位置] 成都市武侯区集合点',
      type: 'LOCATION',
      metadata: { address: '成都市武侯区集合点', lat: 30.65, lng: 104.06, expires_at: new Date(Date.now() + 86400000).toISOString() },
      created_at: new Date().toISOString(),
      sender: { nickname: '房主' },
    }];
    renderPage();
    expect(screen.getByTestId('location-card')).toBeInTheDocument();
    expect(screen.getByText('成都市武侯区集合点')).toBeInTheDocument();
  });

  it('opens location picker dialog when MapPin button clicked', async () => {
    renderPage();
    const user = userEvent.setup();
    const mapPinBtn = screen.getByTitle('发送位置');
    await user.click(mapPinBtn);
    // dialog body text visible
    expect(screen.getByText('选择当前位置或集合点，位置将在 24 小时后自动过期。')).toBeInTheDocument();
    // location picker rendered
    expect(screen.getByText('选择位置')).toBeInTheDocument();
  });

  it('sends location message after selecting location', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTitle('发送位置'));
    await user.click(screen.getByText('选择位置'));
    // 地址预览出现
    await waitFor(() => expect(screen.getByText(/成都市武侯区测试路1号/)).toBeInTheDocument());
    // 点击发送位置
    await user.click(screen.getByRole('button', { name: '发送位置' }));
    await waitFor(() => expect(locationMutateAsyncMock).toHaveBeenCalledWith({
      groupId: 'group-1',
      address: '成都市武侯区测试路1号',
      lat: 30.65,
      lng: 104.06,
    }));
  });

  it('does not send location if none selected', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTitle('发送位置'));
    const sendBtn = screen.getByRole('button', { name: '发送位置' });
    expect(sendBtn).toBeDisabled();
    expect(locationMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('shows toast on location send failure', async () => {
    locationMutateAsyncMock.mockRejectedValue(new Error('网络错误'));
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTitle('发送位置'));
    await user.click(screen.getByText('选择位置'));
    await waitFor(() => screen.getByText(/成都市武侯区测试路1号/));
    await user.click(screen.getByRole('button', { name: '发送位置' }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
  });
});
