import { describe, expect, it } from 'vitest';
import { ACCOUNT_DELETION_STATUS } from '@/constants/accountDeletion';
import {
  buildFinalizeDeletionPatch,
  shouldFinalizeDeletion,
} from '@/lib/account-deletion';

describe('account deletion processor helpers', () => {
  it('marks cooling off request as ready when expired', () => {
    expect(shouldFinalizeDeletion({
      status: ACCOUNT_DELETION_STATUS.COOLING_OFF,
      coolingOffExpireAt: '2026-03-10T00:00:00.000Z',
      deletedAt: null,
    }, new Date('2026-03-11T00:00:00.000Z'))).toBe(true);
  });

  it('does not finalize non cooling-off request or already deleted record', () => {
    expect(shouldFinalizeDeletion({
      status: ACCOUNT_DELETION_STATUS.CANCELLED,
      coolingOffExpireAt: '2026-03-10T00:00:00.000Z',
      deletedAt: null,
    }, new Date('2026-03-11T00:00:00.000Z'))).toBe(false);

    expect(shouldFinalizeDeletion({
      status: ACCOUNT_DELETION_STATUS.COOLING_OFF,
      coolingOffExpireAt: '2026-03-10T00:00:00.000Z',
      deletedAt: '2026-03-11T00:00:00.000Z',
    }, new Date('2026-03-11T00:00:00.000Z'))).toBe(false);
  });

  it('builds desensitized profile patch', () => {
    const patch = buildFinalizeDeletionPatch({
      userId: 'user-1',
      deletedAt: '2026-03-11T00:00:00.000Z',
    });

    expect(patch.profileUpdate).toMatchObject({
      is_banned: true,
      can_create_group: false,
      can_join_group: false,
      deletion_status: ACCOUNT_DELETION_STATUS.COMPLETED,
      deletion_completed_at: '2026-03-11T00:00:00.000Z',
      deleted_at: '2026-03-11T00:00:00.000Z',
      nickname: '已注销用户',
      avatar_url: null,
      phone: null,
      city_id: null,
      onboarding_completed: false,
    });

    expect(patch.authUpdate.user_metadata).toMatchObject({
      deletion_status: ACCOUNT_DELETION_STATUS.COMPLETED,
      deleted: true,
      nickname: '已注销用户',
    });
  });
});
