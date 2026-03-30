import { describe, expect, it } from 'vitest';
import {
  createDefaultRealNameSnapshot,
  getRealNameStatusViewModel,
  normalizeRealNameStatus,
  shouldBlockByRestrictionLevel,
  shouldShowRealNameGuard,
  type RealNameVerificationSnapshot,
} from '@/lib/real-name-verification';

function createSnapshot(overrides: Partial<RealNameVerificationSnapshot> = {}): RealNameVerificationSnapshot {
  return {
    status: 'unverified',
    display_status_text: '未实名',
    can_submit: true,
    can_resubmit: false,
    can_cancel: false,
    reject_reason_text: null,
    verified_at: null,
    last_submitted_at: null,
    restriction_level: 'none',
    restriction_scenes: [],
    ...overrides,
  };
}

describe('real-name-verification helpers', () => {
  it('normalizes approved status to verified', () => {
    expect(normalizeRealNameStatus('approved')).toBe('verified');
  });

  it('maps four-state snapshot into verified view model', () => {
    const viewModel = getRealNameStatusViewModel(createSnapshot({
      status: 'approved',
      display_status_text: '已实名',
      verified_at: '2026-03-30T10:00:00.000Z',
      can_submit: false,
    }));

    expect(viewModel.status).toBe('verified');
    expect(viewModel.isVerified).toBe(true);
    expect(viewModel.badgeText).toBe('已实名');
    expect(viewModel.canSubmit).toBe(false);
  });

  it('falls back to default display text when backend text is empty', () => {
    const viewModel = getRealNameStatusViewModel(createSnapshot({
      status: 'rejected',
      display_status_text: '',
    }));

    expect(viewModel.badgeText).toBe('认证失败');
  });

  it('shows guard when scene is restricted', () => {
    const snapshot = createSnapshot({
      restriction_level: 'limited',
      restriction_scenes: ['group_create'],
    });

    expect(shouldShowRealNameGuard(snapshot, 'group_create')).toBe(true);
    expect(shouldShowRealNameGuard(snapshot, 'group_join')).toBe(false);
  });

  it('supports legacy restriction scene aliases', () => {
    const snapshot = createDefaultRealNameSnapshot();

    expect(shouldShowRealNameGuard(snapshot, 'create_group')).toBe(true);
    expect(shouldShowRealNameGuard(snapshot, 'join_group')).toBe(true);
  });

  it('fails closed when restriction scenes are unknown but level requires restriction', () => {
    const snapshot = createSnapshot({
      restriction_level: 'limited',
      restriction_scenes: ['unknown_scene'] as any,
    });

    expect(shouldShowRealNameGuard(snapshot, 'group_create')).toBe(true);
  });

  it('treats blocked level as hard block', () => {
    expect(shouldBlockByRestrictionLevel('blocked')).toBe(true);
    expect(shouldBlockByRestrictionLevel('prompt_only')).toBe(false);
  });
});
