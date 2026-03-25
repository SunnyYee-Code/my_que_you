import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ReportDialog from '../ReportDialog';

const mockToast = vi.fn();
const insertMock = vi.fn();
let currentUser: any = { id: 'reporter-1' };

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: currentUser }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ insert: insertMock }),
  },
}));

describe('ReportDialog', () => {
  it('submits report after selecting reason', async () => {
    insertMock.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<ReportDialog reportedId="reported-1" groupId="group-1" />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button', { name: '恶意爽约' }));
    await user.type(screen.getByPlaceholderText('请描述具体情况...'), '经常爽约');
    await user.click(screen.getByRole('button', { name: '提交举报' }));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        reporter_id: 'reporter-1',
        reported_id: 'reported-1',
        group_id: 'group-1',
        reason: '恶意爽约',
        detail: '经常爽约',
      }));
    });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: '举报已提交' }));
  });
});
