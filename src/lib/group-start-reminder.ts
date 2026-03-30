type ActiveGroupStatus = 'OPEN' | 'FULL';
type InactiveGroupStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type GroupStartReminderGroupStatus = ActiveGroupStatus | InactiveGroupStatus;
export type GroupStartReminderRole = 'host' | 'member';
export type GroupStartReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled' | 'superseded';

export const GROUP_START_REMINDER_ADVANCE_MINUTES = 30;

export interface GroupStartReminderPlan {
  groupId: string;
  userId: string;
  role: GroupStartReminderRole;
  remindAt: string;
  scheduledStartTime: string;
}

interface BuildGroupStartReminderPlansInput {
  groupId: string;
  hostId: string;
  memberIds: string[];
  startTime: string;
  status: GroupStartReminderGroupStatus;
}

interface ResolveGroupStartReminderStatusInput {
  currentStatus: GroupStartReminderStatus;
  groupStatus: GroupStartReminderGroupStatus;
  scheduledStartTime: string;
  latestStartTime: string;
  sentAt: string | null;
}

interface BuildGroupStartReminderNotificationInput {
  role: GroupStartReminderRole;
  address: string;
  startTime: string;
  neededSlots: number;
  totalSlots: number;
  joinedCount: number;
  groupId: string;
}

function getReminderTime(startTime: string) {
  return new Date(new Date(startTime).getTime() - GROUP_START_REMINDER_ADVANCE_MINUTES * 60 * 1000).toISOString();
}

function isActiveGroupStatus(status: GroupStartReminderGroupStatus): status is ActiveGroupStatus {
  return status === 'OPEN' || status === 'FULL';
}

export function buildGroupStartReminderPlans(input: BuildGroupStartReminderPlansInput): GroupStartReminderPlan[] {
  if (!isActiveGroupStatus(input.status)) return [];

  const remindAt = getReminderTime(input.startTime);
  const dedupedMembers = Array.from(
    new Set(input.memberIds.filter((memberId) => memberId && memberId !== input.hostId)),
  );

  return [
    {
      groupId: input.groupId,
      userId: input.hostId,
      role: 'host',
      remindAt,
      scheduledStartTime: input.startTime,
    },
    ...dedupedMembers.map((memberId) => ({
      groupId: input.groupId,
      userId: memberId,
      role: 'member' as const,
      remindAt,
      scheduledStartTime: input.startTime,
    })),
  ];
}

export function resolveGroupStartReminderStatus(input: ResolveGroupStartReminderStatusInput): GroupStartReminderStatus {
  if (input.sentAt || input.currentStatus === 'sent') return 'sent';
  if (!isActiveGroupStatus(input.groupStatus)) return 'cancelled';
  if (input.scheduledStartTime !== input.latestStartTime) return 'superseded';
  return input.currentStatus;
}

export function shouldSendGroupStartReminder(plan: GroupStartReminderPlan, now = new Date()) {
  const remindAtTime = new Date(plan.remindAt).getTime();
  const startTime = new Date(plan.scheduledStartTime).getTime();
  const nowTime = now.getTime();

  return nowTime >= remindAtTime && nowTime < startTime;
}

export function buildGroupStartReminderNotification(input: BuildGroupStartReminderNotificationInput) {
  const joinedSummary = `${input.joinedCount}/${input.totalSlots}人`;
  const shortageText = input.neededSlots > 0 ? `，当前仍差${input.neededSlots}人` : '';

  if (input.role === 'host') {
    return {
      type: 'group_start_reminder' as const,
      title: '你的拼团即将开局',
      content: `你在「${input.address}」发起的拼团还有30分钟开局，目前已到${joinedSummary}${shortageText}，请尽快确认到场安排。`,
      linkTo: `/group/${input.groupId}`,
    };
  }

  return {
    type: 'group_start_reminder' as const,
    title: '你加入的拼团即将开局',
    content: `你报名的「${input.address}」还有30分钟开局，目前已到${joinedSummary}，请准时到场并留意房主消息。`,
    linkTo: `/group/${input.groupId}`,
  };
}
