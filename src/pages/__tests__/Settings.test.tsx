import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from '@/pages/Settings';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const useAuthMock = vi.fn();
const useCreditHistoryMock = vi.fn();
const updateProfileHookMock = vi.fn();
const useAccountDeletionStatusMock = vi.fn();
const useApplyAccountDeletionMock = vi.fn();
const useCancelAccountDeletionMock = vi.fn();
const useRealNameVerificationMock = vi.fn();
const useSubmitRealNameVerificationMock = vi.fn();
const useCancelRealNameVerificationMock = vi.fn();
const useBlacklistMock = vi.fn();
const useRemoveFromBlacklistMock = vi.fn();
const fromMock = vi.fn();
const updateDbMock = vi.fn();
const eqMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const updateUserMock = vi.fn();
const signOutMock = vi.fn();
const refreshProfileMock = vi.fn();
const applyDeletionMutateAsyncMock = vi.fn();
const cancelDeletionMutateAsyncMock = vi.fn();
const submitRealNameMutateAsyncMock = vi.fn();
const cancelRealNameMutateAsyncMock = vi.fn();
const removeFromBlacklistMutateAsyncMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('@/hooks/useProfile', () => ({
  useCreditHistory: (...args: any[]) => useCreditHistoryMock(...args),
  useUpdateProfile: () => updateProfileHookMock(),
}));
vi.mock('@/hooks/useRealNameVerification', () => ({
  useRealNameVerification: () => useRealNameVerificationMock(),
  useSubmitRealNameVerification: () => useSubmitRealNameVerificationMock(),
  useCancelRealNameVerification: () => useCancelRealNameVerificationMock(),
}));
vi.mock('@/hooks/useAccountDeletion', () => ({
  useAccountDeletionStatus: () => useAccountDeletionStatusMock(),
  useApplyAccountDeletion: () => useApplyAccountDeletionMock(),
  useCancelAccountDeletion: () => useCancelAccountDeletionMock(),
}));
vi.mock('@/hooks/useBlacklist', () => ({
  useBlacklist: () => useBlacklistMock(),
  useRemoveFromBlacklist: () => useRemoveFromBlacklistMock(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => fromMock(...args),
    auth: {
      signInWithPassword: (...args: any[]) => signInWithPasswordMock(...args),
      updateUser: (...args: any[]) => updateUserMock(...args),
    },
  },
}));
vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: any) => <div>{nickname}</div> }));
vi.mock('@/components/shared/CreditBadge', () => ({ default: ({ score }: any) => <div>credit:{score}</div> }));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>loading</div> }));
vi.mock('@/components/ui/card', () => ({ Card: ({ children, ...props }: any) => <div {...props}>{children}</div>, CardContent: ({ children }: any) => <div>{children}</div>, CardHeader: ({ children }: any) => <div>{children}</div>, CardTitle: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }));
vi.mock('@/components/ui/textarea', () => ({ Textarea: (props: any) => <textarea {...props} /> }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock('@/components/ui/checkbox', () => ({ Checkbox: ({ checked, onCheckedChange }: any) => <input type="checkbox" checked={!!checked} onChange={(e) => onCheckedChange?.(e.target.checked)} /> }));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

function renderPage() {
  return render(<MemoryRouter><SettingsPage /></MemoryRouter>);
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOutMock.mockResolvedValue(undefined);
    refreshProfileMock.mockResolvedValue(undefined);
    applyDeletionMutateAsyncMock.mockResolvedValue({});
    cancelDeletionMutateAsyncMock.mockResolvedValue({});
    submitRealNameMutateAsyncMock.mockResolvedValue({});
    cancelRealNameMutateAsyncMock.mockResolvedValue({});
    removeFromBlacklistMutateAsyncMock.mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      user: { id: 'u1', email: 'user@example.com' },
      profile: { nickname: '老雀友', phone: '13800138000', credit_score: 95, created_at: new Date().toISOString() },
      signOut: signOutMock,
      refreshProfile: refreshProfileMock,
      loading: false,
      isTest: false,
    });
    useCreditHistoryMock.mockReturnValue({
      data: [
        { id: 'c1', reason: '临开局退出', change: -5, can_appeal: true, appeal_status: null, created_at: new Date().toISOString() },
      ],
      isLoading: false,
    });
    useAccountDeletionStatusMock.mockReturnValue({
      data: {
        applyStatus: 'not_applied',
        canOperate: true,
        forbiddenReason: '',
        coolingOffExpireAt: null,
        resultReason: '',
      },
      isLoading: false,
    });
    useApplyAccountDeletionMock.mockReturnValue({ isPending: false, mutateAsync: applyDeletionMutateAsyncMock });
    useCancelAccountDeletionMock.mockReturnValue({ isPending: false, mutateAsync: cancelDeletionMutateAsyncMock });
    useRealNameVerificationMock.mockReturnValue({
      data: {
        status: 'unverified',
        display_status_text: '未实名',
        can_submit: true,
        can_resubmit: false,
        can_cancel: false,
        reject_reason_text: null,
        verified_at: null,
        last_submitted_at: null,
        restriction_level: 'limited',
        restriction_scenes: ['group_create', 'group_join'],
      },
      isLoading: false,
    });
    useSubmitRealNameVerificationMock.mockReturnValue({ isPending: false, mutateAsync: submitRealNameMutateAsyncMock });
    useCancelRealNameVerificationMock.mockReturnValue({ isPending: false, mutateAsync: cancelRealNameMutateAsyncMock });
    useBlacklistMock.mockReturnValue({
      data: [
        {
          id: 'blacklist-1',
          blocker_id: 'u1',
          blocked_id: 'u2',
          created_at: '2026-03-30T08:00:00.000Z',
          blocked_profile: {
            id: 'u2',
            nickname: '麻烦用户',
            uid: 'UID0002',
          },
        },
      ],
      isLoading: false,
    });
    useRemoveFromBlacklistMock.mockReturnValue({ isPending: false, mutateAsync: removeFromBlacklistMutateAsyncMock });
    updateProfileHookMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
    eqMock.mockResolvedValue({ error: null });
    updateDbMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ update: updateDbMock });
  });

  it('blocks empty credit appeal reason', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '提交申诉' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({ title: '请填写申诉理由', variant: 'destructive' });
    });
    expect(updateDbMock).not.toHaveBeenCalled();
  });

  it('submits credit appeal with pending status', async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('请输入申诉理由...'), { target: { value: '我已提前说明，请复核' } });
    fireEvent.click(screen.getByRole('button', { name: '提交申诉' }));

    await waitFor(() => {
      expect(updateDbMock).toHaveBeenCalledWith({ appeal_status: 'pending', appeal_reason: '我已提前说明，请复核' });
      expect(eqMock).toHaveBeenCalledWith('id', 'c1');
      expect(toastMock).toHaveBeenCalledWith({ title: '申诉已提交', description: '我们会在48小时内审核' });
    });
  });

  it('blocks password change when confirmation does not match', async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('请输入当前密码'), { target: { value: 'old123' } });
    fireEvent.change(screen.getByPlaceholderText('请输入新密码（至少6位）'), { target: { value: 'new123' } });
    fireEvent.change(screen.getByPlaceholderText('请再次输入新密码'), { target: { value: 'new456' } });
    fireEvent.click(screen.getByRole('button', { name: '确认修改密码' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({ title: '两次输入的密码不一致', variant: 'destructive' });
    });
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it('submits account deletion application from not_applied status', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '确认注销' }));

    await waitFor(() => {
      expect(applyDeletionMutateAsyncMock).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith({
        title: '注销申请已提交',
        description: '账号已进入冷静期，请在到期前确认是否撤销。',
      });
    });
  });

  it('shows forbidden reason and blocks apply when canOperate is false', async () => {
    useAccountDeletionStatusMock.mockReturnValue({
      data: {
        applyStatus: 'not_applied',
        canOperate: false,
        forbiddenReason: '你有进行中的牌局，暂不可申请注销',
        coolingOffExpireAt: null,
        resultReason: '',
      },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('你有进行中的牌局，暂不可申请注销')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '注销账号' })).toBeDisabled();
  });

  it('shows completed account deletion status and no longer renders apply actions', async () => {
    useAccountDeletionStatusMock.mockReturnValue({
      data: {
        applyStatus: 'completed',
        canOperate: false,
        forbiddenReason: '',
        coolingOffExpireAt: null,
        resultReason: '冷静期结束，系统已自动完成账号注销',
      },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('账号已完成注销')).toBeInTheDocument();
    expect(screen.getByText('冷静期结束，系统已自动完成账号注销')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '撤销注销申请' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认注销' })).not.toBeInTheDocument();
  });

  it('forces sign out and redirects to login when deletion status becomes completed', async () => {
    useAccountDeletionStatusMock.mockReturnValue({
      data: {
        applyStatus: 'completed',
        canOperate: false,
        forbiddenReason: '',
        coolingOffExpireAt: null,
        resultReason: '冷静期结束，系统已自动完成账号注销',
      },
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith('/login');
      expect(toastMock).toHaveBeenCalledWith({
        title: '账号已注销',
        description: '当前登录态已失效，请使用其他账号重新登录。',
      });
    });
  });

  it('renders cooling off status and supports revoke', async () => {
    useAccountDeletionStatusMock.mockReturnValue({
      data: {
        applyStatus: 'cooling_off',
        canOperate: true,
        forbiddenReason: '',
        coolingOffExpireAt: '2026-04-01T12:00:00.000Z',
        resultReason: '',
      },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('账号注销冷静期中')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '撤销注销申请' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '撤销注销申请' }));

    await waitFor(() => {
      expect(cancelDeletionMutateAsyncMock).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith({
        title: '已撤销注销申请',
        description: '你的账号状态已恢复正常。',
      });
    });
  });

  it('submits real-name verification form from settings page', async () => {
    submitRealNameMutateAsyncMock.mockResolvedValue({});
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('请输入真实姓名'), { target: { value: '张三' } });
    fireEvent.change(screen.getByPlaceholderText('请输入身份证号'), { target: { value: '110101199001011234' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '提交认证' }));

    await waitFor(() => {
      expect(submitRealNameMutateAsyncMock).toHaveBeenCalledWith({
        real_name: '张三',
        id_number: '110101199001011234',
        consent_checked: true,
      });
      expect(toastMock).toHaveBeenCalledWith({
        title: '实名认证提交成功',
        description: '资料已提交，等待平台审核。',
      });
    });
  });

  it('renders pending status and supports cancel action placeholder', async () => {
    cancelRealNameMutateAsyncMock.mockResolvedValue({});
    useRealNameVerificationMock.mockReturnValue({
      data: {
        status: 'pending',
        display_status_text: '审核中',
        can_submit: false,
        can_resubmit: false,
        can_cancel: true,
        reject_reason_text: null,
        verified_at: null,
        last_submitted_at: '2026-03-30T10:00:00.000Z',
        restriction_level: 'none',
        restriction_scenes: [],
      },
      isLoading: false,
    });

    renderPage();
    expect(screen.getByText('审核中', { selector: 'span' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '撤销申请' }));

    await waitFor(() => {
      expect(cancelRealNameMutateAsyncMock).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith({
        title: '已撤销实名认证申请',
        description: '当前已恢复为未实名状态。',
      });
    });
  });

  it('renders approved and rejected states from unified adapter', () => {
    useRealNameVerificationMock.mockReturnValueOnce({
      data: {
        status: 'approved',
        display_status_text: '已实名',
        can_submit: false,
        can_resubmit: false,
        can_cancel: false,
        reject_reason_text: null,
        verified_at: '2026-03-30T11:00:00.000Z',
        last_submitted_at: '2026-03-30T10:00:00.000Z',
        restriction_level: 'none',
        restriction_scenes: [],
      },
      isLoading: false,
    });
    const { rerender } = renderPage();
    expect(screen.getByText('已实名')).toBeInTheDocument();

    useRealNameVerificationMock.mockReturnValueOnce({
      data: {
        status: 'rejected',
        display_status_text: '认证失败',
        can_submit: false,
        can_resubmit: true,
        can_cancel: false,
        reject_reason_text: '身份证信息不清晰',
        verified_at: null,
        last_submitted_at: '2026-03-30T10:00:00.000Z',
        restriction_level: 'none',
        restriction_scenes: [],
      },
      isLoading: false,
    });
    rerender(<MemoryRouter><SettingsPage /></MemoryRouter>);
    expect(screen.getByText('认证失败')).toBeInTheDocument();
    expect(screen.getByText(/身份证信息不清晰/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新提交' })).toBeInTheDocument();
  });

  it('falls back to unverified actions when backend returns cancelled status', () => {
    useRealNameVerificationMock.mockReturnValueOnce({
      data: {
        status: 'cancelled',
        display_status_text: '已撤销',
        can_submit: true,
        can_resubmit: false,
        can_cancel: false,
        reject_reason_text: null,
        verified_at: null,
        last_submitted_at: '2026-03-30T10:00:00.000Z',
        restriction_level: 'none',
        restriction_scenes: [],
      },
      isLoading: false,
    });

    renderPage();
    expect(screen.getByText('已撤销')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交认证' })).toBeInTheDocument();
  });

  it('renders blacklist management and supports removing blocked users', async () => {
    renderPage();

    expect(screen.getByText('黑名单管理')).toBeInTheDocument();
    expect(screen.getByText('麻烦用户')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '移除黑名单' }));

    await waitFor(() => {
      expect(removeFromBlacklistMutateAsyncMock).toHaveBeenCalledWith('blacklist-1');
      expect(toastMock).toHaveBeenCalledWith({
        title: '已移除黑名单',
        description: '该用户已恢复正常互动权限。',
      });
    });
  });
});
