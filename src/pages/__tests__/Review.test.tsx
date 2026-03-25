import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ReviewPage from '@/pages/Review';

const useAuthMock = vi.fn();
const useGroupDetailMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/useGroups', () => ({
  useGroupDetail: (...args: any[]) => useGroupDetailMock(...args),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: (...args: any[]) => useQueryMock(...args),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: any) => <div>{nickname}</div> }));
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>loading...</div> }));
vi.mock('@/components/ui/card', () => ({ Card: ({ children }: any) => <div>{children}</div>, CardContent: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock('@/components/ui/textarea', () => ({ Textarea: (props: any) => <textarea {...props} /> }));
vi.mock('@/components/ui/slider', () => ({ Slider: () => <div>slider</div> }));

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
});
