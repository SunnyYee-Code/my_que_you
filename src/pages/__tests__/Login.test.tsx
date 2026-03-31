import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/Login';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const useAuthMock = vi.fn();
const invokeMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const resendMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: null }),
  };
});

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: any[]) => invokeMock(...args) },
    auth: {
      signInWithPassword: (...args: any[]) => signInWithPasswordMock(...args),
      resend: (...args: any[]) => resendMock(...args),
    },
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) })),
  },
}));

vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock('@/components/ui/input', () => ({ Input: ({ ...props }: any) => <input {...props} /> }));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id }: any) => (
    <input id={id} type="checkbox" aria-label={id} checked={!!checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
  ),
}));
vi.mock('@/components/ui/input-otp', () => ({
  InputOTP: ({ value, onChange }: any) => <input aria-label="验证码" value={value} onChange={(e) => onChange?.(e.target.value)} />,
  InputOTPGroup: ({ children }: any) => <div>{children}</div>,
  InputOTPSlot: () => <span />,
}));
vi.mock('@/components/ui/tabs', () => {
  const React = require('react');
  const Ctx = React.createContext({ value: 'login', setValue: (_value: string) => {} });
  return {
    Tabs: ({ value, onValueChange, children }: any) => <Ctx.Provider value={{ value, setValue: onValueChange }}>{children}</Ctx.Provider>,
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ children, value }: any) => {
      const ctx = React.useContext(Ctx);
      return <button type="button" data-value={value} onClick={() => ctx.setValue(value)}>{children}</button>;
    },
    TabsContent: ({ children, value }: any) => {
      const ctx = React.useContext(Ctx);
      return ctx.value === value ? <div>{children}</div> : null;
    },
  };
});

function renderPage() {
  return render(<MemoryRouter><LoginPage /></MemoryRouter>);
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ user: null, profile: null });
  });

  it('keeps login button disabled until user agrees to protocol', () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('请输入手机号、用户名或邮箱'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: '123456' } });

    const submit = screen.getAllByRole('button', { name: '登录' })[1];
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByLabelText('agree-login'));
    expect(screen.getAllByRole('button', { name: '登录' })[1]).not.toBeDisabled();
  });

  it('resolves nickname to email before password login', async () => {
    invokeMock.mockResolvedValueOnce({ data: { email: 'nick@example.com', user_id: 'u1' }, error: null });
    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    renderPage();
    fireEvent.click(screen.getByLabelText('agree-login'));
    fireEvent.change(screen.getByPlaceholderText('请输入手机号、用户名或邮箱'), { target: { value: '麻将高手' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: '123456' } });
    fireEvent.click(screen.getAllByRole('button', { name: '登录' })[1]);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('lookup-email', { body: { nickname: '麻将高手' } });
      expect(signInWithPasswordMock).toHaveBeenCalledWith({ email: 'nick@example.com', password: '123456' });
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '登录成功' }));
    });
  });

  it('resolves phone number to email before password login', async () => {
    invokeMock.mockResolvedValueOnce({ data: { email: 'phone@example.com', user_id: 'u2' }, error: null });
    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    renderPage();
    fireEvent.click(screen.getByLabelText('agree-login'));
    fireEvent.change(screen.getByPlaceholderText('请输入手机号、用户名或邮箱'), { target: { value: '13800138000' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: '123456' } });
    fireEvent.click(screen.getAllByRole('button', { name: '登录' })[1]);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('lookup-email', { body: { phone: '13800138000' } });
      expect(signInWithPasswordMock).toHaveBeenCalledWith({ email: 'phone@example.com', password: '123456' });
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '登录成功' }));
    });
  });

  it('keeps register submit disabled until agreement is checked', () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: '注册' })[0]);
    fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码（至少6位）'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('请输入手机号'), { target: { value: '13800138000' } });

    const registerBtn = screen.getAllByRole('button', { name: '注册' })[1];
    expect(registerBtn).toBeDisabled();

    fireEvent.click(screen.getByLabelText('agree-register'));
    expect(screen.getAllByRole('button', { name: '注册' })[1]).not.toBeDisabled();
  });

  it('sends OTP after registration checks pass', async () => {
    invokeMock
      .mockResolvedValueOnce({ data: { available: true }, error: null })
      .mockResolvedValueOnce({ data: { allowed: true }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });

    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: '注册' })[0]);
    fireEvent.click(screen.getByLabelText('agree-register'));
    fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码（至少6位）'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('请输入手机号'), { target: { value: '13800138000' } });
    fireEvent.click(screen.getAllByRole('button', { name: '注册' })[1]);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenNthCalledWith(1, 'validate-registration', { body: { phone: '13800138000', action: 'check_phone' } });
      expect(invokeMock).toHaveBeenNthCalledWith(2, 'validate-registration', { body: { email: 'new@example.com', action: 'check_registration' } });
      expect(invokeMock).toHaveBeenNthCalledWith(3, 'send-email-otp', { body: { email: 'new@example.com', type: 'register' } });
    });
    expect(await screen.findByText('邮箱验证')).toBeInTheDocument();
  });

  it('passes normalized invite code when verifying registration otp', async () => {
    invokeMock
      .mockResolvedValueOnce({ data: { available: true }, error: null })
      .mockResolvedValueOnce({ data: { allowed: true }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: { success: true, user_id: 'u-new' }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: '注册' })[0]);
    fireEvent.click(screen.getByLabelText('agree-register'));
    fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码（至少6位）'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('请输入手机号'), { target: { value: '13800138000' } });
    fireEvent.change(screen.getByPlaceholderText('请输入邀请码（选填）'), { target: { value: ' abcd1234 ' } });
    fireEvent.click(screen.getAllByRole('button', { name: '注册' })[1]);

    expect(await screen.findByText('邮箱验证')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('验证码'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '验证' }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenNthCalledWith(4, 'verify-email-otp', {
        body: {
          email: 'new@example.com',
          code: '123456',
          type: 'register',
          password: '123456',
          phone: '13800138000',
          invite_code: 'ABCD1234',
        },
      });
      expect(invokeMock).toHaveBeenNthCalledWith(5, 'validate-registration', {
        body: { action: 'record_registration' },
      });
      expect(signInWithPasswordMock).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: '123456',
      });
    });
  });

  it('does not let register invite-code state block normal login', async () => {
    invokeMock.mockResolvedValueOnce({ data: { email: 'nick@example.com', user_id: 'u1' }, error: null });
    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: '注册' })[0]);
    fireEvent.change(screen.getByPlaceholderText('请输入邀请码（选填）'), { target: { value: '12' } });
    fireEvent.click(screen.getAllByRole('button', { name: '登录' })[0]);
    fireEvent.click(screen.getByLabelText('agree-login'));
    fireEvent.change(screen.getByPlaceholderText('请输入手机号、用户名或邮箱'), { target: { value: '麻将高手' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: '123456' } });
    fireEvent.click(screen.getAllByRole('button', { name: '登录' })[1]);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('lookup-email', { body: { nickname: '麻将高手' } });
      expect(signInWithPasswordMock).toHaveBeenCalledWith({ email: 'nick@example.com', password: '123456' });
    });
  });
});
