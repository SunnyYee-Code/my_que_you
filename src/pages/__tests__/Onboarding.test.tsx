import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingPage from '@/pages/Onboarding';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const useAuthMock = vi.fn();
const validateNoBannedWordsMock = vi.fn();
const fromMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const neqMock = vi.fn();
const limitMock = vi.fn();
const updateMock = vi.fn();
const uploadMock = vi.fn();
const getPublicUrlMock = vi.fn();
const refreshProfileMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('@/lib/banned-words', () => ({ validateNoBannedWords: (...args: any[]) => validateNoBannedWordsMock(...args) }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => fromMock(...args),
    storage: {
      from: () => ({
        upload: (...args: any[]) => uploadMock(...args),
        getPublicUrl: (...args: any[]) => getPublicUrlMock(...args),
      }),
    },
  },
}));

vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: any) => <div>{nickname}</div> }));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));

function mockProfileQueries(existingUsers: any[] = []) {
  const selectChain: any = { eq: eqMock };
  eqMock.mockImplementation(() => ({ neq: neqMock }));
  neqMock.mockImplementation(() => ({ limit: limitMock }));
  limitMock.mockResolvedValue({ data: existingUsers });

  const updateChain: any = { eq: vi.fn().mockResolvedValue({ error: null }) };
  updateMock.mockReturnValue(updateChain);

  fromMock.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: (...args: any[]) => selectMock(...args) || selectChain,
        update: (...args: any[]) => updateMock(...args),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>
  );
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshProfileMock.mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      user: { id: 'u1' },
      profile: { onboarding_completed: false },
      refreshProfile: refreshProfileMock,
    });
    validateNoBannedWordsMock.mockResolvedValue(null);
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://cdn/avatar.png' } });
    uploadMock.mockResolvedValue({ error: null });
    mockProfileQueries([]);
  });

  it('redirects unfinished session without user to login', () => {
    useAuthMock.mockReturnValue({ user: null, profile: null, refreshProfile: refreshProfileMock });
    renderPage();
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('blocks banned nickname on onboarding completion', async () => {
    validateNoBannedWordsMock.mockResolvedValue('昵称包含违禁词');
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('请输入用户名（2-20个字符）'), { target: { value: '违规昵称' } });
    fireEvent.click(screen.getByRole('button', { name: '确定，进入社区' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({ title: '昵称包含违禁词', variant: 'destructive' });
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('blocks duplicated nickname on onboarding completion', async () => {
    mockProfileQueries([{ id: 'other-user' }]);
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('请输入用户名（2-20个字符）'), { target: { value: '现有昵称' } });
    fireEvent.click(screen.getByRole('button', { name: '确定，进入社区' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({ title: '该用户名已被使用，请换一个', variant: 'destructive' });
    });
  });

  it('updates profile and redirects to community after successful onboarding', async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('请输入用户名（2-20个字符）'), { target: { value: '雀友新人' } });
    fireEvent.click(screen.getByRole('button', { name: '确定，进入社区' }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({ nickname: '雀友新人', onboarding_completed: true });
      expect(refreshProfileMock).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/community', { replace: true });
    });
  });
});
