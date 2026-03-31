import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewPage from '@/pages/Review';

const useAuthMock = vi.fn();
const useGroupDetailMock = vi.fn();
const useQueryMock = vi.fn();
const navigateMock = vi.fn();
const toastMock = vi.fn();
const insertMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/useGroups', () => ({
  useGroupDetail: (...args: any[]) => useGroupDetailMock(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: (...args: any[]) => useQueryMock(...args),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: insertMock,
      select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(async () => ({ data: [], error: null })) })) })),
    })),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: any) => <div>{nickname}</div> }));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>loading...</div> }));
vi.mock('@/components/ui/card', () => ({ Card: ({ children }: any) => <div>{children}</div>, CardContent: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock('@/components/ui/textarea', () => ({ Textarea: (props: any) => <textarea {...props} /> }));
vi.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange }: any) => <input aria-label="slider" type="range" value={value?.[0] ?? 3} onChange={(e) => onValueChange?.([Number(e.target.value)])} />
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/review/group-1']}>
      <Routes>
        <Route path="/review/:id" element={<ReviewPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ReviewPage', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useGroupDetailMock.mockReset();
    useQueryMock.mockReset();
    navigateMock.mockReset();
    toastMock.mockReset();
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
  });

  it('shows expired banner when group end time is over 24 hours ago', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
    useQueryMock.mockReturnValue({ data: [], isLoading: false });
    useGroupDetailMock.mockReturnValue({
      isLoading: false,
      data: {
        end_time: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        members: [],
      },
    });

    renderPage();

    expect(screen.getByText('评价已过期，超过24小时无法评价')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument();
  });

  it('shows thank-you banner when user has already reviewed', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
    useQueryMock.mockReturnValue({ data: [{ id: 'review-1' }], isLoading: false });
    useGroupDetailMock.mockReturnValue({
      isLoading: false,
      data: {
        end_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        members: [],
      },
    });

    renderPage();

    expect(screen.getByText('您已完成评价，感谢您的反馈！')).toBeInTheDocument();
  });

  it('submits multi-dimension reviews successfully', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
    useQueryMock.mockReturnValue({ data: [], isLoading: false });
    useGroupDetailMock.mockReturnValue({
      isLoading: false,
      data: {
        id: 'group-1',
        end_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        members: [
          { user_id: 'u1', profiles: { nickname: '我' } },
          { user_id: 'u2', profiles: { nickname: '牌友A' } },
        ],
      },
    });

    renderPage();
    const user = userEvent.setup();
    const textarea = await screen.findByPlaceholderText('写点评价（选填）');
    await user.type(textarea, '配合很好');
    await user.click(screen.getByRole('button', { name: '准时守约' }));
    await user.click(screen.getByRole('button', { name: '沟通顺畅' }));
    fireEvent.change(screen.getAllByLabelText('slider')[0], { target: { value: '5' } });
    await user.click(screen.getByRole('button', { name: '提交评价' }));

    await waitFor(() => expect(insertMock).toHaveBeenCalled());
    expect(insertMock).toHaveBeenCalledWith([expect.objectContaining({
      group_id: 'group-1',
      reviewer_id: 'u1',
      target_id: 'u2',
      punctuality: 5,
      comment: '配合很好',
      tags: ['准时守约', '沟通顺畅'],
    })]);
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '评价已提交' }));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });
});
