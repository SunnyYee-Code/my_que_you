export type NotificationReachChannel = 'in_app' | 'subscription' | 'sms';
export type NotificationDeliveryStatus = 'pending' | 'sent' | 'failed';
export type NotificationAudienceRole =
  | 'applicant'
  | 'host'
  | 'member'
  | 'reported_user';
export type NotificationEventKey =
  | 'review_submission'
  | 'review_result'
  | 'group_start_reminder'
  | 'emergency_fill'
  | 'report_result'
  | 'membership_change';

export interface NotificationReachPlan {
  eventKey: NotificationEventKey;
  audienceRole: NotificationAudienceRole;
  primaryChannel: NotificationReachChannel;
  fallbackChannels: NotificationReachChannel[];
  recallDelayMinutes: number | null;
  maxRecallCount: number;
  frequencyWindowMinutes: number;
}

interface BuildNotificationReachPlanInput {
  eventKey: NotificationEventKey;
  audienceRole: NotificationAudienceRole;
}

interface RecallDecisionInput {
  plan: NotificationReachPlan;
  sentAt: string | null;
  readAt: string | null;
  clickedAt: string | null;
  recallCount: number;
  now?: Date;
}

interface FrequencyWindowInput {
  plan: NotificationReachPlan;
  previousSentAt: string | null;
  now?: Date;
}

interface BuildNotificationDeliveryFieldsInput {
  plan: NotificationReachPlan;
  now?: string;
  deliveryStatus?: NotificationDeliveryStatus;
  recallCount?: number;
  recallOfNotificationId?: string | null;
  metadata?: Record<string, unknown>;
}

interface BuildNotificationOpenPatchInput {
  read: boolean;
  readAt: string | null;
  clickedAt: string | null;
  hasNavigationTarget: boolean;
  now?: string;
}

type NotificationDeliveryFields = {
  reach_channel: NotificationReachChannel;
  delivery_status: NotificationDeliveryStatus;
  delivered_at: string | null;
  recall_count: number;
  recall_of_notification_id: string | null;
  metadata: Record<string, unknown>;
};

type NotificationOpenPatch = {
  read: true;
  read_at: string;
  clicked_at?: string;
};

const PLAN_PRESETS: Record<NotificationEventKey, Omit<NotificationReachPlan, 'eventKey' | 'audienceRole'>> = {
  review_submission: {
    primaryChannel: 'in_app',
    fallbackChannels: [],
    recallDelayMinutes: null,
    maxRecallCount: 0,
    frequencyWindowMinutes: 30,
  },
  review_result: {
    primaryChannel: 'in_app',
    fallbackChannels: ['subscription'],
    recallDelayMinutes: 30,
    maxRecallCount: 1,
    frequencyWindowMinutes: 5,
  },
  group_start_reminder: {
    primaryChannel: 'in_app',
    fallbackChannels: ['subscription'],
    recallDelayMinutes: 10,
    maxRecallCount: 1,
    frequencyWindowMinutes: 60,
  },
  emergency_fill: {
    primaryChannel: 'in_app',
    fallbackChannels: ['subscription', 'sms'],
    recallDelayMinutes: 5,
    maxRecallCount: 2,
    frequencyWindowMinutes: 10,
  },
  report_result: {
    primaryChannel: 'in_app',
    fallbackChannels: ['subscription'],
    recallDelayMinutes: 30,
    maxRecallCount: 1,
    frequencyWindowMinutes: 30,
  },
  membership_change: {
    primaryChannel: 'in_app',
    fallbackChannels: [],
    recallDelayMinutes: null,
    maxRecallCount: 0,
    frequencyWindowMinutes: 1,
  },
};

export function buildNotificationReachPlan(
  input: BuildNotificationReachPlanInput,
): NotificationReachPlan {
  return {
    eventKey: input.eventKey,
    audienceRole: input.audienceRole,
    ...PLAN_PRESETS[input.eventKey],
  };
}

export function shouldRecallNotification(input: RecallDecisionInput) {
  if (!input.sentAt || input.plan.recallDelayMinutes == null) return false;
  if (input.readAt || input.clickedAt) return false;
  if (input.recallCount >= input.plan.maxRecallCount) return false;

  const now = input.now ?? new Date();
  const sentAtTime = new Date(input.sentAt).getTime();
  const dueAt = sentAtTime + input.plan.recallDelayMinutes * 60 * 1000;

  return now.getTime() >= dueAt;
}

export function isNotificationWithinFrequencyWindow(input: FrequencyWindowInput) {
  if (!input.previousSentAt) return false;

  const now = input.now ?? new Date();
  const previousSentAtTime = new Date(input.previousSentAt).getTime();
  const windowMs = input.plan.frequencyWindowMinutes * 60 * 1000;

  return now.getTime() - previousSentAtTime < windowMs;
}

export function buildNotificationDeliveryFields(
  input: BuildNotificationDeliveryFieldsInput,
): NotificationDeliveryFields {
  const now = input.now ?? new Date().toISOString();
  const deliveryStatus = input.deliveryStatus ?? 'sent';

  return {
    reach_channel: input.plan.primaryChannel,
    delivery_status: deliveryStatus,
    delivered_at: deliveryStatus === 'failed' ? null : now,
    recall_count: input.recallCount ?? 0,
    recall_of_notification_id: input.recallOfNotificationId ?? null,
    metadata: {
      event_key: input.plan.eventKey,
      audience_role: input.plan.audienceRole,
      fallback_channels: input.plan.fallbackChannels,
      frequency_window_minutes: input.plan.frequencyWindowMinutes,
      max_recall_count: input.plan.maxRecallCount,
      recall_delay_minutes: input.plan.recallDelayMinutes,
      ...(input.metadata ?? {}),
    },
  };
}

export function buildNotificationOpenPatch(
  input: BuildNotificationOpenPatchInput,
): NotificationOpenPatch {
  const now = input.now ?? new Date().toISOString();

  return {
    read: true,
    read_at: input.readAt ?? now,
    ...(input.hasNavigationTarget ? { clicked_at: input.clickedAt ?? now } : {}),
  };
}
