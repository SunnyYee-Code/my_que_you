import { describe, expect, it } from 'vitest';
import {
  buildRealNameStatusSnapshot,
  REAL_NAME_STATUS,
  validateSubmitEligibility,
  validateResubmitEligibility,
  validateCancelEligibility,
  buildRiskFlags,
  maskIdNumber,
  type RealNameStatusState,
} from '@/lib/real-name-verification';

describe('real name function contract helpers', () => {
  const baseState: RealNameStatusState = {
    status: REAL_NAME_STATUS.UNVERIFIED,
    reviewRequired: false,
    rejectReasonCode: null,
    rejectReasonText: null,
    verifiedAt: null,
    lastSubmittedAt: null,
    currentRequestId: null,
    restrictionScenes: ['group_create', 'group_join'],
  };

  it('returns unified snapshot fields for approved user', () => {
    const snapshot = buildRealNameStatusSnapshot({
      ...baseState,
      status: REAL_NAME_STATUS.APPROVED,
      verifiedAt: '2026-03-30T12:00:00.000Z',
      currentRequestId: 'req-1',
      restrictionScenes: [],
    });

    expect(snapshot).toMatchObject({
      status: REAL_NAME_STATUS.APPROVED,
      displayStatusText: '已实名',
      canSubmit: false,
      canResubmit: false,
      canCancel: false,
      isVerified: true,
      isPending: false,
      restrictionLevel: 'none',
      verifiedAt: '2026-03-30T12:00:00.000Z',
      currentRequestId: 'req-1',
    });
  });

  it('submit eligibility allows unverified and rejects pending/reviewed statuses', () => {
    expect(validateSubmitEligibility({ status: REAL_NAME_STATUS.UNVERIFIED, hasPendingRequest: false })).toEqual({ ok: true });
    expect(validateSubmitEligibility({ status: REAL_NAME_STATUS.PENDING, hasPendingRequest: true })).toMatchObject({ ok: false });
    expect(validateSubmitEligibility({ status: REAL_NAME_STATUS.APPROVED, hasPendingRequest: false })).toMatchObject({ ok: false });
  });

  it('resubmit/cancel eligibility matches state machine', () => {
    expect(validateResubmitEligibility({ status: REAL_NAME_STATUS.REJECTED })).toEqual({ ok: true });
    expect(validateResubmitEligibility({ status: REAL_NAME_STATUS.UNVERIFIED })).toMatchObject({ ok: false });
    expect(validateCancelEligibility({ status: REAL_NAME_STATUS.PENDING })).toEqual({ ok: true });
    expect(validateCancelEligibility({ status: REAL_NAME_STATUS.REJECTED })).toMatchObject({ ok: false });
  });

  it('masks sensitive fields and computes risk flags', () => {
    expect(maskIdNumber('110101199001011234')).toBe('110101********1234');
    expect(buildRiskFlags({ duplicateIdHashCount: 2, reportedUser: true })).toEqual(['duplicate_id_hash', 'reported_user']);
  });
});
