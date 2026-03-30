import { describe, expect, it } from 'vitest';
import {
  buildBackendRealNameSnapshot,
  evaluateRealNameSubmission,
} from '@/lib/real-name-backend';

describe('real-name-backend helpers', () => {
  it('auto-approves low-risk valid submissions', () => {
    const result = evaluateRealNameSubmission({
      realName: '张三',
      idNumber: '110101199001011234',
      duplicateIdHashCount: 0,
      reportedUser: false,
    });

    expect(result.decision).toBe('approved');
    expect(result.reviewRequired).toBe(false);
    expect(result.riskFlags).toEqual([]);
  });

  it('sends duplicate or reported users to pending manual review', () => {
    const result = evaluateRealNameSubmission({
      realName: '张三',
      idNumber: '110101199001011234',
      duplicateIdHashCount: 2,
      reportedUser: true,
    });

    expect(result.decision).toBe('pending');
    expect(result.reviewRequired).toBe(true);
    expect(result.riskFlags).toEqual(['duplicate_id_hash', 'reported_user']);
  });

  it('rejects invalid id numbers before review', () => {
    const result = evaluateRealNameSubmission({
      realName: '张三',
      idNumber: '12345',
      duplicateIdHashCount: 0,
      reportedUser: false,
    });

    expect(result.decision).toBe('rejected');
    expect(result.reviewRequired).toBe(false);
    expect(result.rejectReasonCode).toBe('INVALID_ID_NUMBER');
  });

  it('builds frontend snapshot fields for a pending review request', () => {
    const snapshot = buildBackendRealNameSnapshot({
      profileStatus: 'pending',
      requestStatus: 'pending',
      requestId: 'req-1',
      rejectReasonCode: null,
      rejectReasonText: null,
      verifiedAt: null,
      lastSubmittedAt: '2026-03-30T12:00:00.000Z',
      reviewRequired: true,
      restrictionLevel: 'limited',
      restrictionScenes: ['group_create', 'group_join'],
    });

    expect(snapshot).toMatchObject({
      status: 'pending',
      can_submit: false,
      can_resubmit: false,
      can_cancel: true,
      current_request_id: 'req-1',
      review_required: true,
      restriction_level: 'limited',
      restriction_scenes: ['group_create', 'group_join'],
    });
  });
});
