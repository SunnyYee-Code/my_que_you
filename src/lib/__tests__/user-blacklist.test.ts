import { describe, expect, it } from 'vitest';
import { getUserBlacklistState } from '@/lib/user-blacklist';

describe('getUserBlacklistState', () => {
  it('returns none when there is no blacklist entry between two users', () => {
    expect(getUserBlacklistState([], 'user-1', 'user-2')).toEqual({
      isBlocked: false,
      relationship: 'none',
      blockedByUserId: null,
      reason: '',
    });
  });

  it('marks relationship as blocked_by_me when current user blocked target user', () => {
    expect(
      getUserBlacklistState(
        [{ blocker_id: 'user-1', blocked_id: 'user-2' }],
        'user-1',
        'user-2',
      ),
    ).toEqual({
      isBlocked: true,
      relationship: 'blocked_by_me',
      blockedByUserId: 'user-1',
      reason: '你已将对方加入黑名单，当前无法继续互动',
    });
  });

  it('marks relationship as blocked_by_them when target user blocked current user', () => {
    expect(
      getUserBlacklistState(
        [{ blocker_id: 'user-2', blocked_id: 'user-1' }],
        'user-1',
        'user-2',
      ),
    ).toEqual({
      isBlocked: true,
      relationship: 'blocked_by_them',
      blockedByUserId: 'user-2',
      reason: '由于对方的隐私设置，当前无法继续互动',
    });
  });
});
