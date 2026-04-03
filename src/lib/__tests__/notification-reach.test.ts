import { describe, expect, it } from 'vitest';
import {
  buildNotificationDeliveryFields,
  buildNotificationOpenPatch,
  buildNotificationReachPlan,
  isNotificationWithinFrequencyWindow,
  shouldRecallNotification,
} from '@/lib/notification-reach';

describe('notification reach helpers', () => {
  it('builds layered reach plans for high-priority review results', () => {
    const plan = buildNotificationReachPlan({
      eventKey: 'review_result',
      audienceRole: 'applicant',
    });

    expect(plan).toMatchObject({
      primaryChannel: 'in_app',
      fallbackChannels: ['subscription'],
      recallDelayMinutes: 30,
      maxRecallCount: 1,
      frequencyWindowMinutes: 5,
    });
  });

  it('uses stronger recall and fallback rules for emergency fill hosts', () => {
    const plan = buildNotificationReachPlan({
      eventKey: 'emergency_fill',
      audienceRole: 'host',
    });

    expect(plan).toMatchObject({
      primaryChannel: 'in_app',
      fallbackChannels: ['subscription', 'sms'],
      recallDelayMinutes: 5,
      maxRecallCount: 2,
      frequencyWindowMinutes: 10,
    });
  });

  it('schedules recall only for unread and unclicked notifications after delay', () => {
    const plan = buildNotificationReachPlan({
      eventKey: 'group_start_reminder',
      audienceRole: 'member',
    });

    expect(shouldRecallNotification({
      plan,
      sentAt: '2026-04-03T10:00:00.000Z',
      readAt: null,
      clickedAt: null,
      recallCount: 0,
      now: new Date('2026-04-03T10:10:00.000Z'),
    })).toBe(true);

    expect(shouldRecallNotification({
      plan,
      sentAt: '2026-04-03T10:00:00.000Z',
      readAt: '2026-04-03T10:02:00.000Z',
      clickedAt: null,
      recallCount: 0,
      now: new Date('2026-04-03T10:10:00.000Z'),
    })).toBe(false);

    expect(shouldRecallNotification({
      plan,
      sentAt: '2026-04-03T10:00:00.000Z',
      readAt: null,
      clickedAt: '2026-04-03T10:02:00.000Z',
      recallCount: 0,
      now: new Date('2026-04-03T10:10:00.000Z'),
    })).toBe(false);
  });

  it('applies frequency windows to repeated sends', () => {
    const plan = buildNotificationReachPlan({
      eventKey: 'emergency_fill',
      audienceRole: 'host',
    });

    expect(isNotificationWithinFrequencyWindow({
      plan,
      previousSentAt: '2026-04-03T10:02:00.000Z',
      now: new Date('2026-04-03T10:08:00.000Z'),
    })).toBe(true);

    expect(isNotificationWithinFrequencyWindow({
      plan,
      previousSentAt: '2026-04-03T09:40:00.000Z',
      now: new Date('2026-04-03T10:08:00.000Z'),
    })).toBe(false);
  });

  it('builds delivery fields with tracking metadata', () => {
    const plan = buildNotificationReachPlan({
      eventKey: 'report_result',
      audienceRole: 'reported_user',
    });

    expect(buildNotificationDeliveryFields({
      plan,
      now: '2026-04-03T10:00:00.000Z',
      metadata: {
        reportId: 'report-1',
      },
    })).toEqual({
      reach_channel: 'in_app',
      delivery_status: 'sent',
      delivered_at: '2026-04-03T10:00:00.000Z',
      recall_count: 0,
      recall_of_notification_id: null,
      metadata: {
        event_key: 'report_result',
        audience_role: 'reported_user',
        fallback_channels: ['subscription'],
        frequency_window_minutes: 30,
        max_recall_count: 1,
        recall_delay_minutes: 30,
        reportId: 'report-1',
      },
    });
  });

  it('builds read and click tracking patch when opening a notification', () => {
    expect(buildNotificationOpenPatch({
      read: false,
      readAt: null,
      clickedAt: null,
      hasNavigationTarget: true,
      now: '2026-04-03T10:00:00.000Z',
    })).toEqual({
      read: true,
      read_at: '2026-04-03T10:00:00.000Z',
      clicked_at: '2026-04-03T10:00:00.000Z',
    });
  });

  it('preserves existing timestamps when notification was already opened', () => {
    expect(buildNotificationOpenPatch({
      read: true,
      readAt: '2026-04-03T09:58:00.000Z',
      clickedAt: '2026-04-03T09:59:00.000Z',
      hasNavigationTarget: true,
      now: '2026-04-03T10:00:00.000Z',
    })).toEqual({
      read: true,
      read_at: '2026-04-03T09:58:00.000Z',
      clicked_at: '2026-04-03T09:59:00.000Z',
    });
  });

  it('does not set clicked_at when notification has no navigation target', () => {
    expect(buildNotificationOpenPatch({
      read: false,
      readAt: null,
      clickedAt: null,
      hasNavigationTarget: false,
      now: '2026-04-03T10:00:00.000Z',
    })).toEqual({
      read: true,
      read_at: '2026-04-03T10:00:00.000Z',
    });
  });
});
