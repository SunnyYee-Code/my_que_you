export const GROUP_START_REMINDER_ADVANCE_MINUTES = 30;

export type GroupStartReminderGroupStatus =
  | "OPEN"
  | "FULL"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export type GroupStartReminderRole = "host" | "member";
export type GroupStartReminderStatus =
  | "pending"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled"
  | "superseded";

export interface GroupStartReminderPlan {
  groupId: string;
  userId: string;
  role: GroupStartReminderRole;
  remindAt: string;
  scheduledStartTime: string;
}

export interface ReminderStoreRecord extends GroupStartReminderPlan {
  id: string;
  status: GroupStartReminderStatus;
  sentAt: string | null;
}

export interface ReminderNotificationInput {
  role: GroupStartReminderRole;
  address: string;
  neededSlots: number;
  totalSlots: number;
  joinedCount: number;
  groupId: string;
}

export interface ReminderDeliveryStore {
  findByKey(plan: GroupStartReminderPlan): Promise<ReminderStoreRecord | null>;
  createPending(plan: GroupStartReminderPlan): Promise<ReminderStoreRecord | null>;
  claimForSending(reminderId: string): Promise<ReminderStoreRecord | null>;
  sendNotification(input: {
    userId: string;
    title: string;
    content: string;
    groupId: string;
  }): Promise<{ id: string }>;
  markSent(input: {
    reminderId: string;
    notificationId: string;
    sentAt: string;
  }): Promise<boolean>;
  markFailed(input: {
    reminderId: string;
    errorMessage: string;
  }): Promise<void>;
}

export function isSchedulableGroupStartReminderStatus(status: GroupStartReminderGroupStatus) {
  return status === "OPEN" || status === "FULL";
}

export function getGroupStartReminderTime(startTime: string) {
  return new Date(
    new Date(startTime).getTime() - GROUP_START_REMINDER_ADVANCE_MINUTES * 60 * 1000,
  ).toISOString();
}

export function buildGroupStartReminderPlans(input: {
  groupId: string;
  hostId: string;
  memberIds: string[];
  startTime: string;
  status: GroupStartReminderGroupStatus;
}): GroupStartReminderPlan[] {
  if (!isSchedulableGroupStartReminderStatus(input.status)) return [];

  const remindAt = getGroupStartReminderTime(input.startTime);
  const memberIds = Array.from(new Set(input.memberIds))
    .filter((memberId) => memberId && memberId !== input.hostId);

  return [
    {
      groupId: input.groupId,
      userId: input.hostId,
      role: "host",
      remindAt,
      scheduledStartTime: input.startTime,
    },
    ...memberIds.map((memberId) => ({
      groupId: input.groupId,
      userId: memberId,
      role: "member" as const,
      remindAt,
      scheduledStartTime: input.startTime,
    })),
  ];
}

export function resolveGroupStartReminderStatus(input: {
  currentStatus: GroupStartReminderStatus;
  groupStatus: GroupStartReminderGroupStatus;
  scheduledStartTime: string;
  latestStartTime: string;
  sentAt: string | null;
}) {
  if (input.sentAt || input.currentStatus === "sent") return "sent" as const;
  if (!isSchedulableGroupStartReminderStatus(input.groupStatus)) return "cancelled" as const;
  if (input.scheduledStartTime !== input.latestStartTime) return "superseded" as const;
  return input.currentStatus;
}

export function shouldSendGroupStartReminder(plan: GroupStartReminderPlan, now = new Date()) {
  const nowTime = now.getTime();
  return nowTime >= new Date(plan.remindAt).getTime()
    && nowTime < new Date(plan.scheduledStartTime).getTime();
}

export function buildGroupStartReminderNotification(input: ReminderNotificationInput) {
  const joinedSummary = `${input.joinedCount}/${input.totalSlots}人`;
  const shortageText = input.neededSlots > 0 ? `，当前仍差${input.neededSlots}人` : "";

  if (input.role === "host") {
    return {
      title: "你的拼团即将开局",
      content: `你在「${input.address}」发起的拼团还有30分钟开局，目前已到${joinedSummary}${shortageText}，请尽快确认到场安排。`,
    };
  }

  return {
    title: "你加入的拼团即将开局",
    content: `你报名的「${input.address}」还有30分钟开局，目前已到${joinedSummary}，请准时到场并留意房主消息。`,
  };
}

export async function deliverGroupStartReminder(input: {
  plan: GroupStartReminderPlan;
  notification: {
    userId: string;
    title: string;
    content: string;
    groupId: string;
  };
  now?: Date;
  store: ReminderDeliveryStore;
}) {
  const now = input.now ?? new Date();
  let reminder = await input.store.findByKey(input.plan);

  if (!reminder) {
    reminder = await input.store.createPending(input.plan);
    if (!reminder) {
      reminder = await input.store.findByKey(input.plan);
    }
  }

  if (!reminder) {
    return { outcome: "failed" as const, reason: "missing_reminder_record" as const };
  }

  if (reminder.sentAt || reminder.status === "sent") {
    return { outcome: "skipped" as const, reason: "already_sent" as const };
  }

  if (!shouldSendGroupStartReminder(reminder, now)) {
    return { outcome: "skipped" as const, reason: "outside_send_window" as const };
  }

  const claimedReminder = await input.store.claimForSending(reminder.id);
  if (!claimedReminder) {
    return { outcome: "skipped" as const, reason: "already_claimed" as const };
  }

  try {
    const notification = await input.store.sendNotification(input.notification);
    const markedSent = await input.store.markSent({
      reminderId: claimedReminder.id,
      notificationId: notification.id,
      sentAt: now.toISOString(),
    });

    if (!markedSent) {
      return { outcome: "failed" as const, reason: "mark_sent_failed" as const };
    }

    return { outcome: "sent" as const, reminderId: claimedReminder.id, notificationId: notification.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown_send_error";
    await input.store.markFailed({ reminderId: claimedReminder.id, errorMessage });
    return { outcome: "failed" as const, reason: "notification_send_failed" as const };
  }
}
