import { describe, expect, it } from 'vitest';
import {
  buildRecallNotificationInsert,
  isRecallWithinFrequencyWindow,
  shouldScheduleNotificationRecall,
  type RecallableNotificationRecord,
} from '../../../supabase/functions/_shared/notification-reach';

function buildNotification(overrides: Partial<RecallableNotificationRecord> = {}): RecallableNotificationRecord {
  return {
    id: 'notification-1',
    user_id: 'user-1',
    type: 'group_start_reminder',
    title: '你加入的拼团即将开局',
    content: '请准时到场',
    link_to: '/group/group-1',
    delivered_at: '2026-04-03T10:00:00.000Z',
    read: false,
    read_at: null,
    clicked_at: null,
    recall_count: 0,
    metadata: {
      event_key: 'group_start_reminder',
      audience_role: 'member',
      fallback_channels: ['subscription', 'sms'],
      frequency_window_minutes: 10,
      max_recall_count: 1,
      recall_delay_minutes: 5,
    },
    ...overrides,
  };
}

describe('notification recall delivery helpers', () => {
  it('schedules recall only for unread notifications after recall delay', () => {
    expect(shouldScheduleNotificationRecall(
      buildNotification(),
      new Date('2026-04-03T10:06:00.000Z'),
    )).toBe(true);

    expect(shouldScheduleNotificationRecall(
      buildNotification({ read_at: '2026-04-03T10:01:00.000Z' }),
      new Date('2026-04-03T10:06:00.000Z'),
    )).toBe(false);

    expect(shouldScheduleNotificationRecall(
      buildNotification({ clicked_at: '2026-04-03T10:01:00.000Z' }),
      new Date('2026-04-03T10:06:00.000Z'),
    )).toBe(false);
  });

  it('respects frequency window for repeated recall attempts', () => {
    expect(isRecallWithinFrequencyWindow({
      previousSentAt: '2026-04-03T10:03:00.000Z',
      frequencyWindowMinutes: 10,
      now: new Date('2026-04-03T10:06:00.000Z'),
    })).toBe(true);

    expect(isRecallWithinFrequencyWindow({
      previousSentAt: '2026-04-03T09:40:00.000Z',
      frequencyWindowMinutes: 10,
      now: new Date('2026-04-03T10:06:00.000Z'),
    })).toBe(false);
  });

  it('builds a recall notification insert with fallback channel tracking', () => {
    expect(buildRecallNotificationInsert({
      notification: buildNotification(),
      channel: 'subscription',
      now: '2026-04-03T10:06:00.000Z',
    })).toEqual({
      user_id: 'user-1',
      type: 'group_start_reminder',
      title: '你加入的拼团即将开局',
      content: '请准时到场',
      link_to: '/group/group-1',
      reach_channel: 'subscription',
      delivery_status: 'sent',
      delivered_at: '2026-04-03T10:06:00.000Z',
      recall_count: 0,
      recall_of_notification_id: 'notification-1',
      metadata: {
        event_key: 'group_start_reminder',
        audience_role: 'member',
        fallback_channels: ['subscription', 'sms'],
        frequency_window_minutes: 10,
        max_recall_count: 1,
        recall_delay_minutes: 5,
        recall_channel: 'subscription',
      },
    });
  });
});
