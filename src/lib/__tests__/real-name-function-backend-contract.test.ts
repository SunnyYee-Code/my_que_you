import { describe, expect, it } from 'vitest';
import { adaptRealNameSnapshot } from '@/constants/realName';

describe('real-name backend snapshot contract', () => {
  it('preserves backend metadata fields needed by review flow', () => {
    const snapshot = adaptRealNameSnapshot({
      status: 'pending',
      display_status_text: '审核中',
      can_submit: false,
      can_resubmit: false,
      can_cancel: true,
      reject_reason_code: 'RISK_REVIEW',
      reject_reason_text: '命中风险规则，等待人工审核',
      verified_at: null,
      last_submitted_at: '2026-03-30T12:00:00.000Z',
      current_request_id: 'req-1',
      review_required: true,
      restriction_level: 'limited',
      restriction_scenes: ['group_create', 'group_join'],
    });

    expect(snapshot.current_request_id).toBe('req-1');
    expect(snapshot.review_required).toBe(true);
    expect(snapshot.reject_reason_code).toBe('RISK_REVIEW');
    expect(snapshot.reject_reason_text).toBe('命中风险规则，等待人工审核');
  });
});
