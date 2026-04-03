import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationsPage from '@/pages/Notifications';

const navigateMock = vi.fn();
const useAuthMock = vi.fn();
const useNotificationsMock = vi.fn();
const mutateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => useNotificationsMock(),
  useMarkNotificationRead: () => ({ mutate: mutateMock }),
}));
vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/shared/EmptyState', () => ({ default: ({ title }: any) => <div>{title}</div> }));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>loading</div> }));
vi.mock('@/components/ui/card', () => ({ Card: ({ children, ...props }: any) => <div {...props}>{children}</div>, CardContent: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));

function renderPage() {
  return render(<MemoryRouter><NotificationsPage /></MemoryRouter>);
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
  });

  it('shows empty state when there are no notifications', () => {
    useNotificationsMock.mockReturnValue({ data: [], isLoading: false });
    renderPage();
    expect(screen.getByText('暂无消息')).toBeInTheDocument();
  });

  it('marks notification as read and navigates to target link on click', () => {
    useNotificationsMock.mockReturnValue({
      data: [
        {
          id: 'n1',
          type: 'application_update',
          title: '申请状态更新',
          content: '你的申请已通过',
          created_at: new Date().toISOString(),
          read: false,
          read_at: null,
          clicked_at: null,
          link_to: '/group/g1',
        },
      ],
      isLoading: false,
    });

    renderPage();
    fireEvent.click(screen.getByText('申请状态更新'));

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      id: 'n1',
      link_to: '/group/g1',
    }));
    expect(navigateMock).toHaveBeenCalledWith('/group/g1');
  });

  it('renders group start reminder notifications and keeps click behavior', () => {
    useNotificationsMock.mockReturnValue({
      data: [
        {
          id: 'n2',
          type: 'group_start_reminder',
          title: '你加入的拼团即将开局',
          content: '你报名的高新牌馆还有30分钟开局，请准时到场。',
          created_at: new Date().toISOString(),
          read: false,
          read_at: null,
          clicked_at: null,
          link_to: '/group/g2',
        },
      ],
      isLoading: false,
    });

    renderPage();
    fireEvent.click(screen.getByText('你加入的拼团即将开局'));

    expect(screen.getByText('你报名的高新牌馆还有30分钟开局，请准时到场。')).toBeInTheDocument();
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      id: 'n2',
      type: 'group_start_reminder',
    }));
    expect(navigateMock).toHaveBeenCalledWith('/group/g2');
  });
});
