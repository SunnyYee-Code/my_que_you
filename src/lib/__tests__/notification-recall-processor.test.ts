import { describe, expect, it, vi } from 'vitest';
import {
  processNotificationRecalls,
  type NotificationRecallStore,
  type RecallableNotificationRecord,
} from '../../../supabase/functions/_shared/notification-recall-processor';

function buildNotification(overrides: Partial<RecallableNotificationRecord> = {}): RecallableNotificationRecord {
  return {
    id: 'notification-1',
    user_id: 'user-1',
    type: 'group_start_reminder',
    title: '提醒',
    content: '请查看',
    link_to: '/group/group-1',
    delivered_at: '2026-04-03T10:00:00.000Z',
    read: false,
    read_at: null,
    clicked_at: null,
    recall_count: 0,
    metadata: {
      event_key: 'emergency_fill',
      audience_role: 'host',
      fallback_channels: ['subscription', 'sms'],
      frequency_window_minutes: 10,
      max_recall_count: 2,
      recall_delay_minutes: 5,
    },
    ...overrides,
  };
}

function buildStore(overrides: Partial<NotificationRecallStore> = {}): NotificationRecallStore {
  return {
    listPrimaryNotifications: vi.fn(async () => [buildNotification()]),
    getLatestRecall: vi.fn(async () => null),
    getCurrentNotificationState: vi.fn(async () => ({ read: false, read_at: null, clicked_at: null })),
    insertRecall: vi.fn(async () => ({ id: 'recall-1', duplicate: false })),
    deliverRecall: vi.fn(async () => ({ status: 'sent', deliveredAt: '2026-04-03T10:06:00.000Z' })),
    incrementRecallCount: vi.fn(async () => undefined),
    logRecallFailure: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('notification recall processor', () => {
  it('creates the first recall on the first fallback channel and increments parent recall count', async () => {
    const store = buildStore();

    const result = await processNotificationRecalls({
      now: new Date('2026-04-03T10:06:00.000Z'),
      store,
    });

    expect(result).toEqual({ recallsCreated: ['recall-1'] });
    expect(store.insertRecall).toHaveBeenCalledWith(expect.objectContaining({
      reach_channel: 'subscription',
      delivery_status: 'pending',
      delivered_at: null,
      recall_of_notification_id: 'notification-1',
    }));
    expect(store.deliverRecall).toHaveBeenCalledWith(expect.objectContaining({
      recallId: 'recall-1',
      channel: 'subscription',
    }));
    expect(store.incrementRecallCount).toHaveBeenCalledWith('notification-1', 1);
  });

  it('upgrades to the next fallback channel on the second recall attempt', async () => {
    const store = buildStore({
      listPrimaryNotifications: vi.fn(async () => [buildNotification({
        recall_count: 1,
        delivered_at: '2026-04-03T09:40:00.000Z',
      })]),
      getLatestRecall: vi.fn(async () => ({
        id: 'recall-1',
        created_at: '2026-04-03T09:50:00.000Z',
      })),
    });

    await processNotificationRecalls({
      now: new Date('2026-04-03T10:06:00.000Z'),
      store,
    });

    expect(store.insertRecall).toHaveBeenCalledWith(expect.objectContaining({
      reach_channel: 'sms',
    }));
    expect(store.incrementRecallCount).toHaveBeenCalledWith('notification-1', 2);
  });

  it('skips recall when latest recall is still within frequency window', async () => {
    const store = buildStore({
      getLatestRecall: vi.fn(async () => ({
        id: 'recall-1',
        created_at: '2026-04-03T10:03:00.000Z',
      })),
    });

    const result = await processNotificationRecalls({
      now: new Date('2026-04-03T10:06:00.000Z'),
      store,
    });

    expect(result).toEqual({ recallsCreated: [] });
    expect(store.insertRecall).not.toHaveBeenCalled();
    expect(store.incrementRecallCount).not.toHaveBeenCalled();
  });

  it('treats duplicate recall insertion as handled to tolerate concurrent workers', async () => {
    const store = buildStore({
      insertRecall: vi.fn(async () => ({ id: null, duplicate: true })),
    });

    const result = await processNotificationRecalls({
      now: new Date('2026-04-03T10:06:00.000Z'),
      store,
    });

    expect(result).toEqual({ recallsCreated: [] });
    expect(store.deliverRecall).not.toHaveBeenCalled();
    expect(store.incrementRecallCount).toHaveBeenCalledWith('notification-1', 1);
  });

  it('skips recall when notification becomes read after initial scan', async () => {
    const store = buildStore({
      getCurrentNotificationState: vi.fn(async () => ({ read: true, read_at: '2026-04-03T10:05:30.000Z', clicked_at: null })),
    });

    const result = await processNotificationRecalls({
      now: new Date('2026-04-03T10:06:00.000Z'),
      store,
    });

    expect(result).toEqual({ recallsCreated: [] });
    expect(store.insertRecall).not.toHaveBeenCalled();
    expect(store.deliverRecall).not.toHaveBeenCalled();
  });

  it('logs recall failure when recall insertion throws', async () => {
    const store = buildStore({
      insertRecall: vi.fn(async () => {
        throw new Error('insert failed');
      }),
    });

    const result = await processNotificationRecalls({
      now: new Date('2026-04-03T10:06:00.000Z'),
      store,
    });

    expect(result).toEqual({ recallsCreated: [] });
    expect(store.logRecallFailure).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'subscription',
      errorMessage: 'insert failed',
    }));
  });

  it('records a consumed recall attempt when external delivery fails so the next channel can take over later', async () => {
    const store = buildStore({
      deliverRecall: vi.fn(async () => ({
        status: 'failed',
        errorMessage: 'subscription webhook missing',
      })),
    });

    const result = await processNotificationRecalls({
      now: new Date('2026-04-03T10:06:00.000Z'),
      store,
    });

    expect(result).toEqual({ recallsCreated: [] });
    expect(store.deliverRecall).toHaveBeenCalledWith(expect.objectContaining({
      recallId: 'recall-1',
      channel: 'subscription',
    }));
    expect(store.incrementRecallCount).toHaveBeenCalledWith('notification-1', 1);
  });
});
