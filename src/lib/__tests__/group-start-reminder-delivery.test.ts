import { describe, expect, it, vi } from 'vitest';
import {
  deliverGroupStartReminder,
  type ReminderDeliveryStore,
  type ReminderStoreRecord,
} from '../../../supabase/functions/_shared/group-start-reminder';

function buildReminder(overrides: Partial<ReminderStoreRecord> = {}): ReminderStoreRecord {
  return {
    id: 'reminder-1',
    groupId: 'group-1',
    userId: 'user-1',
    role: 'member',
    remindAt: '2026-03-30T19:30:00.000Z',
    scheduledStartTime: '2026-03-30T20:00:00.000Z',
    status: 'pending',
    sentAt: null,
    ...overrides,
  };
}

function buildStore(overrides: Partial<ReminderDeliveryStore> = {}): ReminderDeliveryStore {
  return {
    findByKey: vi.fn(async () => buildReminder()),
    createPending: vi.fn(async () => buildReminder()),
    claimForSending: vi.fn(async () => buildReminder({ status: 'sending' })),
    sendNotification: vi.fn(async () => ({ id: 'notification-1' })),
    markSent: vi.fn(async () => true),
    markFailed: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('group-start-reminder delivery', () => {
  const plan = {
    groupId: 'group-1',
    userId: 'user-1',
    role: 'member' as const,
    remindAt: '2026-03-30T19:30:00.000Z',
    scheduledStartTime: '2026-03-30T20:00:00.000Z',
  };

  const notification = {
    userId: 'user-1',
    title: '你加入的拼团即将开局',
    content: '请准时到场',
    groupId: 'group-1',
  };

  it('skips sending when another worker has already claimed the reminder', async () => {
    const store = buildStore({
      claimForSending: vi.fn(async () => null),
    });

    const result = await deliverGroupStartReminder({
      plan,
      notification,
      now: new Date('2026-03-30T19:35:00.000Z'),
      store,
    });

    expect(result).toEqual({ outcome: 'skipped', reason: 'already_claimed' });
    expect(store.sendNotification).not.toHaveBeenCalled();
  });

  it('does not mark reminder failed after notification insert when sent ack write fails', async () => {
    const store = buildStore({
      markSent: vi.fn(async () => false),
    });

    const result = await deliverGroupStartReminder({
      plan,
      notification,
      now: new Date('2026-03-30T19:35:00.000Z'),
      store,
    });

    expect(result).toEqual({ outcome: 'failed', reason: 'mark_sent_failed' });
    expect(store.sendNotification).toHaveBeenCalledTimes(1);
    expect(store.markFailed).not.toHaveBeenCalled();
  });
});
