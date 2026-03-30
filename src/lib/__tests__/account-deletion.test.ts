import { describe, expect, it } from 'vitest';
import { ACCOUNT_DELETION_STATUS } from '@/constants/accountDeletion';
import {
  ACCOUNT_DELETION_ERROR,
  buildAccountDeletionSnapshot,
  calculateCoolingOffExpireAt,
  validateApplyEligibility,
  validateCancelEligibility,
} from '@/lib/account-deletion';

describe('account deletion domain helpers', () => {
  it('returns apply action for eligible not applied status', () => {
    const snapshot = buildAccountDeletionSnapshot({
      applyStatus: ACCOUNT_DELETION_STATUS.NOT_APPLIED,
      coolingOffExpireAt: null,
      resultReason: '',
      updatedAt: '2026-03-26T10:00:00.000Z',
      hasActiveGroups: false,
      hasPendingSettlements: false,
    });

    expect(snapshot).toMatchObject({
      applyStatus: ACCOUNT_DELETION_STATUS.NOT_APPLIED,
      canOperate: true,
      forbiddenReason: '',
      availableActions: ['apply'],
      updatedAt: '2026-03-26T10:00:00.000Z',
    });
  });

  it('blocks apply when user has active groups', () => {
    const result = validateApplyEligibility({
      applyStatus: ACCOUNT_DELETION_STATUS.NOT_APPLIED,
      coolingOffExpireAt: null,
      resultReason: '',
      updatedAt: null,
      hasActiveGroups: true,
      hasPendingSettlements: false,
    });

    expect(result).toEqual({
      ok: false,
      error: ACCOUNT_DELETION_ERROR.ACTIVE_GROUPS,
    });
  });

  it('allows cancel only during cooling off', () => {
    expect(validateCancelEligibility({
      applyStatus: ACCOUNT_DELETION_STATUS.COOLING_OFF,
      coolingOffExpireAt: '2026-04-10T00:00:00.000Z',
      resultReason: '',
      updatedAt: null,
    })).toEqual({ ok: true });

    expect(validateCancelEligibility({
      applyStatus: ACCOUNT_DELETION_STATUS.COMPLETED,
      coolingOffExpireAt: null,
      resultReason: '',
      updatedAt: null,
    })).toEqual({
      ok: false,
      error: ACCOUNT_DELETION_ERROR.INVALID_CANCEL_STATUS,
    });
  });

  it('calculates cooling off expiry at 15 days later by default', () => {
    const now = new Date('2026-03-26T00:00:00.000Z');
    expect(calculateCoolingOffExpireAt(now)).toBe('2026-04-10T00:00:00.000Z');
  });
});
