import { describe, expect, it } from 'vitest';
import {
  GROUP_START_REMINDER_ADVANCE_MINUTES,
  buildGroupStartReminderNotification,
  buildGroupStartReminderPlans,
  resolveGroupStartReminderStatus,
  shouldSendGroupStartReminder,
} from '@/lib/group-start-reminder';

describe('group-start-reminder helpers', () => {
  const startTime = '2026-03-30T20:00:00.000Z';

  it('builds one host reminder and deduplicated member reminders', () => {
    const plans = buildGroupStartReminderPlans({
      groupId: 'group-1',
      hostId: 'host-1',
      memberIds: ['host-1', 'member-1', 'member-1', 'member-2'],
      startTime,
      status: 'OPEN',
    });

    expect(plans).toHaveLength(3);
    expect(plans).toEqual([
      expect.objectContaining({
        groupId: 'group-1',
        userId: 'host-1',
        role: 'host',
        remindAt: '2026-03-30T19:30:00.000Z',
        scheduledStartTime: startTime,
      }),
      expect.objectContaining({
        userId: 'member-1',
        role: 'member',
      }),
      expect.objectContaining({
        userId: 'member-2',
        role: 'member',
      }),
    ]);
  });

  it('skips reminder creation for cancelled groups', () => {
    const plans = buildGroupStartReminderPlans({
      groupId: 'group-1',
      hostId: 'host-1',
      memberIds: ['member-1'],
      startTime,
      status: 'CANCELLED',
    });

    expect(plans).toEqual([]);
  });

  it('skips reminder creation for groups already in progress', () => {
    const plans = buildGroupStartReminderPlans({
      groupId: 'group-1',
      hostId: 'host-1',
      memberIds: ['member-1'],
      startTime,
      status: 'IN_PROGRESS',
    });

    expect(plans).toEqual([]);
  });

  it('marks stale reminder records as superseded when start time changes', () => {
    const status = resolveGroupStartReminderStatus({
      currentStatus: 'pending',
      groupStatus: 'OPEN',
      scheduledStartTime: '2026-03-30T19:00:00.000Z',
      latestStartTime: startTime,
      sentAt: null,
    });

    expect(status).toBe('superseded');
  });

  it('marks reminders as cancelled when the group is cancelled', () => {
    const status = resolveGroupStartReminderStatus({
      currentStatus: 'pending',
      groupStatus: 'CANCELLED',
      scheduledStartTime: startTime,
      latestStartTime: startTime,
      sentAt: null,
    });

    expect(status).toBe('cancelled');
  });

  it('sends reminders only after remind_at and before start_time', () => {
    const plan = buildGroupStartReminderPlans({
      groupId: 'group-1',
      hostId: 'host-1',
      memberIds: ['member-1'],
      startTime,
      status: 'FULL',
    })[0];

    expect(GROUP_START_REMINDER_ADVANCE_MINUTES).toBe(30);
    expect(shouldSendGroupStartReminder(plan, new Date('2026-03-30T19:29:59.000Z'))).toBe(false);
    expect(shouldSendGroupStartReminder(plan, new Date('2026-03-30T19:30:00.000Z'))).toBe(true);
    expect(shouldSendGroupStartReminder(plan, new Date('2026-03-30T20:00:00.000Z'))).toBe(false);
  });

  it('builds different host/member notification copy', () => {
    const hostNotification = buildGroupStartReminderNotification({
      role: 'host',
      address: '高新牌馆',
      startTime,
      neededSlots: 1,
      totalSlots: 4,
      joinedCount: 3,
      groupId: 'group-1',
    });
    const memberNotification = buildGroupStartReminderNotification({
      role: 'member',
      address: '高新牌馆',
      startTime,
      neededSlots: 0,
      totalSlots: 4,
      joinedCount: 4,
      groupId: 'group-1',
    });

    expect(hostNotification).toMatchObject({
      type: 'group_start_reminder',
      title: '你的拼团即将开局',
      linkTo: '/group/group-1',
    });
    expect(hostNotification.content).toContain('还有30分钟');
    expect(hostNotification.content).toContain('仍差1人');

    expect(memberNotification).toMatchObject({
      type: 'group_start_reminder',
      title: '你加入的拼团即将开局',
      linkTo: '/group/group-1',
    });
    expect(memberNotification.content).toContain('请准时到场');
    expect(memberNotification.content).not.toContain('仍差');
  });
});
