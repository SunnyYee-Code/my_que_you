import { describe, expect, it } from 'vitest';
import {
  adaptInviteCodeSnapshot,
  createDefaultInviteCodeSnapshot,
  normalizeInviteCode,
  validateInviteCode,
} from '@/lib/invite-code';

describe('invite-code helpers', () => {
  it('normalizes invite codes by trimming spaces and uppercasing', () => {
    expect(normalizeInviteCode(' abcd1234 ')).toBe('ABCD1234');
    expect(normalizeInviteCode('ab cd-12_34')).toBe('ABCD1234');
  });

  it('validates invite codes and rejects too-short values', () => {
    expect(validateInviteCode('ABCD1234').ok).toBe(true);
    expect(validateInviteCode('12').ok).toBe(false);
  });

  it('adapts backend payload into a stable snapshot', () => {
    const snapshot = adaptInviteCodeSnapshot({
      inviteCode: ' uid00001 ',
      canBind: false,
      invitedCount: 3,
      invitedBy: {
        inviteCode: ' host001 ',
        inviterId: 'u-host',
        inviterNickname: '老房主',
        boundAt: '2026-03-31T10:00:00.000Z',
      },
      recentInvites: [
        {
          inviteeId: 'u-new',
          inviteeNickname: '新朋友',
          boundAt: '2026-03-31T11:00:00.000Z',
        },
      ],
    });

    expect(snapshot).toEqual({
      ...createDefaultInviteCodeSnapshot(),
      inviteCode: 'UID00001',
      canBind: false,
      invitedCount: 3,
      invitedBy: {
        inviteCode: 'HOST001',
        inviterId: 'u-host',
        inviterNickname: '老房主',
        boundAt: '2026-03-31T10:00:00.000Z',
      },
      recentInvites: [
        {
          inviteeId: 'u-new',
          inviteeNickname: '新朋友',
          boundAt: '2026-03-31T11:00:00.000Z',
        },
      ],
    });
  });
});
