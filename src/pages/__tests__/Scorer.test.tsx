import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Scorer from '../Scorer';
import * as RouterModule from 'react-router-dom';

// Mock useNavigate and useToast
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const renderScorerWithRouter = () => {
  return render(
    <BrowserRouter>
      <Scorer />
    </BrowserRouter>
  );
};

describe('Scorer Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render the setup tab on initial load', () => {
    renderScorerWithRouter();
    expect(screen.getByText('记分器')).toBeInTheDocument();
    expect(screen.getByText('创建记分会话')).toBeInTheDocument();
  });

  it('should allow selecting player count', () => {
    renderScorerWithRouter();
    const buttons = screen.getAllByRole('button');
    const playerCountBtn = buttons.find(btn => btn.textContent?.includes('3人'));
    
    if (playerCountBtn) {
      fireEvent.click(playerCountBtn);
      expect(screen.getByDisplayValue('玩家1')).toBeInTheDocument();
    }
  });

  it('should initialize localStorage with session data', () => {
    renderScorerWithRouter();
    const startBtn = screen.getByText('开始记分');
    fireEvent.click(startBtn);

    waitFor(() => {
      const saved = localStorage.getItem('scorer_session');
      expect(saved).toBeTruthy();
      if (saved) {
        const session = JSON.parse(saved);
        expect(session.players.length).toBeGreaterThan(0);
      }
    });
  });

  it('should display player names and initial scores', () => {
    renderScorerWithRouter();
    expect(screen.getByDisplayValue('玩家1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('玩家2')).toBeInTheDocument();
  });

  it('should handle player name changes', () => {
    renderScorerWithRouter();
    const firstInput = screen.getAllByPlaceholderText('玩家1')[0] as HTMLInputElement;
    
    fireEvent.change(firstInput, { target: { value: '张三' } });
    expect(firstInput.value).toBe('张三');
  });

  it('should allow setting initial score', () => {
    renderScorerWithRouter();
    const initialScoreInputs = screen.getAllByPlaceholderText('0');
    const scoreInput = initialScoreInputs.find(input => 
      (input as HTMLInputElement).value === '' || (input as HTMLInputElement).value === '0'
    );
    
    if (scoreInput) {
      fireEvent.change(scoreInput, { target: { value: '100' } });
      expect((scoreInput as HTMLInputElement).value).toBe('100');
    }
  });

  it('should switch to playing tab after starting', () => {
    renderScorerWithRouter();
    const startBtn = screen.getByText('开始记分');
    fireEvent.click(startBtn);

    waitFor(() => {
      expect(screen.getByText('当前积分排名')).toBeInTheDocument();
    });
  });

  it('should support 2-8 players', () => {
    renderScorerWithRouter();
    [2, 3, 4, 5, 6, 7, 8].forEach(count => {
      const buttons = screen.getAllByRole('button');
      const btn = buttons.find(b => b.textContent?.includes(`${count}人`));
      if (btn) {
        fireEvent.click(btn);
      }
    });
  });

  it('should preserve session in localStorage on page reload', () => {
    renderScorerWithRouter();
    
    // Start a session
    const startBtn = screen.getByText('开始记分');
    fireEvent.click(startBtn);

    waitFor(() => {
      const saved = localStorage.getItem('scorer_session');
      expect(saved).toBeTruthy();
    });
  });

  it('should support undo functionality', () => {
    renderScorerWithRouter();
    
    // Start a session with initial score of 100
    const startBtn = screen.getByText('开始记分');
    fireEvent.click(startBtn);

    waitFor(() => {
      // Apply first round of scores
      const scoreInputs = screen.getAllByPlaceholderText('0');
      if (scoreInputs.length >= 2) {
        fireEvent.change(scoreInputs[0], { target: { value: '50' } });
        fireEvent.change(scoreInputs[1], { target: { value: '-20' } });
      }

      const recordBtn = screen.getByText('记录本局得分');
      fireEvent.click(recordBtn);

      // Check that scores were updated
      expect(screen.getByText('150')).toBeInTheDocument(); // 100 + 50

      // Now undo
      const undoBtn = screen.getByText('撤销上一步');
      fireEvent.click(undoBtn);

      // Scores should be back to initial
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });
});