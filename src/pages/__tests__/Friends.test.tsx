import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FriendsPage from '../Friends';

const mockNavigate = vi.fn();
const mockToast = vi.fn();
const mockRespond = vi.fn();
const mockDelete = vi.fn();
const mockSearch = vi.fn();
const mockSendRequest = vi.fn();

let friendsData: any[] = [];
let requestsData: any[] = [];
let dmCounts: any = { byFriend: {}, total: 0 };
let searchResult: any = null;
let friendshipStatus: any = null;
let currentUser: any = { id: 'user-1' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: any) => <span>{nickname}</span> }));
vi.mock('@/components/shared/CreditBadge', () => ({ default: ({ score }: any) => <span>信用{score}</span> }));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>loading...</div> }));
vi.mock('@/components/shared/EmptyState', () => ({ default: ({ title }: any) => <div>{title}</div> }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: currentUser }) }));
vi.mock('@/hooks/useDirectMessages', () => ({ useUnreadDMCounts: () => ({ data: dmCounts }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

vi.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({ data: friendsData, isLoading: false }),
  useFriendRequests: () => ({ data: requestsData, isLoading: false }),
  useRespondFriendRequest: () => ({ mutateAsync: mockRespond, isPending: false }),
  useDeleteFriend: () => ({ mutateAsync: mockDelete, isPending: false }),
  useSearchUserByUid: () => ({ mutateAsync: mockSearch, isPending: false }),
  useSendFriendRequest: () => ({ mutateAsync: mockSendRequest, isPending: false }),
  useFriendshipStatus: () => ({ data: friendshipStatus, isLoading: false }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <FriendsPage />
    </MemoryRouter>,
  );
}

describe('FriendsPage', () => {
  beforeEach(() => {
    friendsData = [
      { friendshipId: 'f-1', profile: { id: 'friend-1', nickname: '好友甲', credit_score: 95 } },
    ];
    requestsData = [
      { id: 'req-1', user_profile: { id: 'user-2', nickname: '申请人' }, message: '一起打牌' },
    ];
    dmCounts = { byFriend: { 'friend-1': 3 }, total: 3 };
    searchResult = { id: 'user-3', uid: 'UID003', nickname: '目标用户', credit_score: 88 };
    friendshipStatus = null;
    currentUser = { id: 'user-1' };
    mockSearch.mockResolvedValue(searchResult);
    mockRespond.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);
    mockSendRequest.mockResolvedValue(undefined);
  });

  it('accepts friend request', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: /好友请求/ }));
    await user.click(screen.getByRole('button', { name: /接受/ }));
    expect(mockRespond).toHaveBeenCalledWith({ friendshipId: 'req-1', accept: true });
  });

  it('deletes friend after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: /好友列表/ }));
    const trashButtons = screen.getAllByRole('button').filter((btn) => btn.getAttribute('class')?.includes('text-destructive'));
    await user.click(trashButtons[0]);
    const confirm = await screen.findAllByText('确认删除');
    await user.click(confirm[confirm.length - 1]);
    expect(mockDelete).toHaveBeenCalledWith('f-1');
  });

  it('searches user by uid and sends friend request', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: /添加好友/ }));
    await user.type(screen.getByPlaceholderText('输入对方UID搜索'), 'UID003');
    await user.click(screen.getByRole('button', { name: /搜索/ }));

    await waitFor(() => expect(screen.getAllByText('目标用户').length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: /加好友/ }));
    await user.type(screen.getByPlaceholderText('填写备注信息（可选）'), '你好');
    await user.click(screen.getByRole('button', { name: '发送好友请求' }));

    expect(mockSearch).toHaveBeenCalledWith('UID003');
    expect(mockSendRequest).toHaveBeenCalledWith({ friendId: 'user-3', message: '你好' });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: '好友请求已发送' }));
  });
});
