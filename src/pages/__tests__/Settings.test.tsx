import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from '@/pages/Settings';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const useAuthMock = vi.fn();
const useCreditHistoryMock = vi.fn();
const updateProfileHookMock = vi.fn();
const fromMock = vi.fn();
const updateDbMock = vi.fn();
const eqMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const updateUserMock = vi.fn();
const signOutMock = vi.fn();
const refreshProfileMock = vi.fn();

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
vi.mock('@/components/ui/card', () => ({ Card: ({ children }: any) => <div>{children}</div>, CardContent: ({ children }: any) => <div>{children}</div>, CardHeader: ({ children }: any) => <div>{children}</div>, CardTitle: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }));
vi.mock('@/components/ui/textarea', () => ({ Textarea: (props: any) => <textarea {...props} /> }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
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
});
