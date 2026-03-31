import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from '@/pages/Profile';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const addToBlacklistMock = vi.fn();

const profileState = vi.hoisted(() => ({
  data: {
    id: 'user-2',
    uid: 'UID0002',
    nickname: '危险用户',
    avatar_url: null,
    credit_score: 60,
    created_at: '2026-03-30T08:00:00.000Z',
  },
  isLoading: false,
}));

const reviewsState = vi.hoisted(() => ({ data: [], isLoading: false }));
const groupsState = vi.hoisted(() => ({ data: [], isLoading: false }));
const creditHistoryState = vi.hoisted(() => ({ data: [], isLoading: false }));
const fulfillmentProfilesState = vi.hoisted(() => ({
  data: {
    'user-2': {
      completedCount: 2,
      breachCount: 1,
      trackedGroupCount: 3,
      fulfillmentRate: 67,
      topPositiveTags: ['准时守约', '沟通顺畅'],
      topRiskTags: ['迟到'],
    },
  },
}));
const blacklistStatusState = vi.hoisted(() => ({
  data: {
    isBlocked: false,
    relationship: 'none',
    blockedByUserId: null,
    reason: '',
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: any) => <div>{nickname}</div> }));
vi.mock('@/components/shared/CreditBadge', () => ({ default: ({ score }: any) => <div>credit:{score}</div> }));
vi.mock('@/components/shared/StatusBadge', () => ({ default: ({ status }: any) => <div>{status}</div> }));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>loading</div> }));
vi.mock('@/components/shared/ReportDialog', () => ({ default: ({ trigger }: any) => <div>{trigger}</div> }));
vi.mock('@/components/ui/card', () => ({ Card: ({ children, ...props }: any) => <div {...props}>{children}</div>, CardContent: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <button>{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' }, isAdmin: false }) }));
vi.mock('@/hooks/useProfile', () => ({
  useProfileById: () => profileState,
  useReviewsByTarget: () => reviewsState,
  useGroupsByMember: () => groupsState,
  useCreditHistory: () => creditHistoryState,
  useFulfillmentProfiles: () => fulfillmentProfilesState,
}));
vi.mock('@/hooks/useBlacklist', () => ({
  useBlacklistStatus: () => blacklistStatusState,
  useAddToBlacklist: () => ({ mutateAsync: addToBlacklistMock, isPending: false }),
  useRemoveFromBlacklist: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/profile/user-2']}>
      <Routes>
        <Route path="/profile/:id" element={<ProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProfilePage blacklist actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewsState.data = [
      { id: 'r1', target_id: 'user-2', comment: '人很好', tags: ['准时守约', '沟通顺畅'], punctuality: 5, attitude: 5, skill: 4 },
      { id: 'r2', target_id: 'user-2', comment: '组织清晰', tags: ['准时守约', '新手友好'], punctuality: 4, attitude: 5, skill: 4 },
    ];
    groupsState.data = [
      { id: 'g1', status: 'COMPLETED', start_time: '2026-03-29T10:00:00.000Z' },
      { id: 'g2', status: 'COMPLETED', start_time: '2026-03-28T10:00:00.000Z' },
      { id: 'g3', status: 'CANCELLED', start_time: '2026-03-27T10:00:00.000Z' },
    ];
    fulfillmentProfilesState.data = {
      'user-2': {
        completedCount: 2,
        breachCount: 1,
        trackedGroupCount: 3,
        fulfillmentRate: 67,
        topPositiveTags: ['准时守约', '沟通顺畅'],
        topRiskTags: ['迟到'],
      },
    };
    blacklistStatusState.data = {
      isBlocked: false,
      relationship: 'none',
      blockedByUserId: null,
      reason: '',
    };
    addToBlacklistMock.mockResolvedValue(undefined);
  });

  it('allows blocking another user from profile page', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '拉黑用户' }));

    await waitFor(() => {
      expect(addToBlacklistMock).toHaveBeenCalledWith({ blockedUserId: 'user-2' });
      expect(toastMock).toHaveBeenCalledWith({
        title: '已加入黑名单',
        description: '你们之间的私聊和好友互动已被屏蔽。',
      });
    });
  });

  it('renders fulfillment archive summary and tag insights', () => {
    renderPage();

    expect(screen.getByText('履约档案')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText('准时守约')).toBeInTheDocument();
    expect(screen.getByText('沟通顺畅')).toBeInTheDocument();
    expect(screen.getByText('失约记录')).toBeInTheDocument();
    expect(screen.getByText('待关注：迟到')).toBeInTheDocument();
  });

  it('shows empty fulfillment copy for users without tracked history', () => {
    fulfillmentProfilesState.data = {
      'user-2': {
        completedCount: 0,
        breachCount: 0,
        trackedGroupCount: 0,
        fulfillmentRate: null,
        topPositiveTags: [],
        topRiskTags: [],
      },
    };

    renderPage();

    expect(screen.getByText('暂无记录')).toBeInTheDocument();
    expect(screen.getByText('暂无可统计的履约记录')).toBeInTheDocument();
  });
});
