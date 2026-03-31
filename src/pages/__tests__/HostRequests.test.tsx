import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HostRequestsPage from '@/pages/HostRequests';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const useAuthMock = vi.fn();
const useJoinRequestsMock = vi.fn();
const mutateAsyncMock = vi.fn();
const useFulfillmentProfilesMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('@/hooks/useGroups', () => ({
  useJoinRequests: () => useJoinRequestsMock(),
  useUpdateRequestStatus: () => ({ mutateAsync: mutateAsyncMock, isPending: false }),
}));
vi.mock('@/hooks/useProfile', () => ({
  useFulfillmentProfiles: (...args: any[]) => useFulfillmentProfilesMock(...args),
}));
vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: any) => <div>{nickname}</div> }));
vi.mock('@/components/shared/CreditBadge', () => ({ default: ({ score }: any) => <div>credit:{score}</div> }));
vi.mock('@/components/shared/EmptyState', () => ({ default: ({ title }: any) => <div>{title}</div> }));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>loading</div> }));
vi.mock('@/components/ui/card', () => ({ Card: ({ children }: any) => <div>{children}</div>, CardContent: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));

function renderPage() {
  return render(<MemoryRouter><HostRequestsPage /></MemoryRouter>);
}

describe('HostRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { id: 'host-1' } });
    useFulfillmentProfilesMock.mockReturnValue({
      data: {
        u1: {
          completedCount: 8,
          breachCount: 2,
          trackedGroupCount: 10,
          fulfillmentRate: 80,
          topPositiveTags: ['准时守约', '沟通顺畅'],
          topRiskTags: ['迟到'],
        },
      },
    });
  });

  it('shows pending count for host applications', () => {
    useJoinRequestsMock.mockReturnValue({
      data: [
        { id: 'r1', status: 'PENDING', user: { id: 'u1', nickname: '申请人1', credit_score: 90 }, group: { address: '牌局A' }, group_id: 'g1', user_id: 'u1' },
        { id: 'r2', status: 'APPROVED', user: { id: 'u2', nickname: '申请人2', credit_score: 80 }, group: { address: '牌局B' }, group_id: 'g2', user_id: 'u2' },
      ],
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('1条待审核')).toBeInTheDocument();
    expect(screen.getByText('申请加入：牌局A')).toBeInTheDocument();
    expect(screen.getByText(/履约率 80%/)).toBeInTheDocument();
    expect(screen.getByText('准时守约')).toBeInTheDocument();
    expect(screen.getByText('待关注：迟到')).toBeInTheDocument();
  });

  it('approves pending request and shows success toast', async () => {
    mutateAsyncMock.mockResolvedValue(undefined);
    useJoinRequestsMock.mockReturnValue({
      data: [
        { id: 'r1', status: 'PENDING', user: { id: 'u1', nickname: '申请人1', credit_score: 90 }, group: { address: '牌局A' }, group_id: 'g1', user_id: 'u1' },
      ],
      isLoading: false,
    });

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /同意/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({ requestId: 'r1', status: 'APPROVED', groupId: 'g1', userId: 'u1' });
      expect(toastMock).toHaveBeenCalledWith({ title: '已同意申请' });
    });
  });

  it('rejects pending request and shows success toast', async () => {
    mutateAsyncMock.mockResolvedValue(undefined);
    useJoinRequestsMock.mockReturnValue({
      data: [
        { id: 'r1', status: 'PENDING', user: { id: 'u1', nickname: '申请人1', credit_score: 90 }, group: { address: '牌局A' }, group_id: 'g1', user_id: 'u1' },
      ],
      isLoading: false,
    });

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /拒绝/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({ requestId: 'r1', status: 'REJECTED', groupId: 'g1', userId: 'u1' });
      expect(toastMock).toHaveBeenCalledWith({ title: '已拒绝申请' });
    });
  });

  it('shows fallback copy when applicant has no fulfillment history', () => {
    useFulfillmentProfilesMock.mockReturnValue({
      data: {
        u1: {
          completedCount: 0,
          breachCount: 0,
          trackedGroupCount: 0,
          fulfillmentRate: null,
          topPositiveTags: [],
          topRiskTags: [],
        },
      },
    });
    useJoinRequestsMock.mockReturnValue({
      data: [
        { id: 'r1', status: 'PENDING', user: { id: 'u1', nickname: '申请人1', credit_score: 90 }, group: { address: '牌局A' }, group_id: 'g1', user_id: 'u1' },
      ],
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('履约记录不足')).toBeInTheDocument();
  });
});
