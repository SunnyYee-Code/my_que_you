export type NotificationFallbackChannel = "in_app" | "subscription" | "sms";

export interface NotificationReachMetadata {
  event_key?: string;
  audience_role?: string;
  fallback_channels?: NotificationFallbackChannel[];
  frequency_window_minutes?: number;
  max_recall_count?: number;
  recall_delay_minutes?: number | null;
}

export interface RecallableNotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  link_to: string | null;
  delivered_at: string | null;
  read: boolean;
  read_at: string | null;
  clicked_at: string | null;
  recall_count: number;
  metadata: Record<string, unknown> | null;
}

export function parseNotificationReachMetadata(metadata: Record<string, unknown> | null | undefined): NotificationReachMetadata {
  const fallbackChannels = Array.isArray(metadata?.fallback_channels)
    ? metadata?.fallback_channels.filter((channel): channel is NotificationFallbackChannel => (
      channel === "in_app" || channel === "subscription" || channel === "sms"
    ))
    : [];

  return {
    event_key: typeof metadata?.event_key === "string" ? metadata.event_key : undefined,
    audience_role: typeof metadata?.audience_role === "string" ? metadata.audience_role : undefined,
    fallback_channels: fallbackChannels,
    frequency_window_minutes: typeof metadata?.frequency_window_minutes === "number"
      ? metadata.frequency_window_minutes
      : undefined,
    max_recall_count: typeof metadata?.max_recall_count === "number"
      ? metadata.max_recall_count
      : undefined,
    recall_delay_minutes: typeof metadata?.recall_delay_minutes === "number"
      ? metadata.recall_delay_minutes
      : metadata?.recall_delay_minutes === null
        ? null
        : undefined,
  };
}

export function shouldScheduleNotificationRecall(
  notification: RecallableNotificationRecord,
  now = new Date(),
) {
  if (notification.read || notification.read_at || notification.clicked_at || !notification.delivered_at) return false;

  const metadata = parseNotificationReachMetadata(notification.metadata);
  if (!metadata.fallback_channels?.length || metadata.recall_delay_minutes == null) return false;
  if ((metadata.max_recall_count ?? 0) <= notification.recall_count) return false;

  const recallAt = new Date(notification.delivered_at).getTime() + metadata.recall_delay_minutes * 60 * 1000;
  return now.getTime() >= recallAt;
}

export function isRecallWithinFrequencyWindow(input: {
  previousSentAt: string | null;
  frequencyWindowMinutes: number | undefined;
  now?: Date;
}) {
  if (!input.previousSentAt || !input.frequencyWindowMinutes) return false;

  const now = input.now ?? new Date();
  const previousSentAt = new Date(input.previousSentAt).getTime();
  return now.getTime() - previousSentAt < input.frequencyWindowMinutes * 60 * 1000;
}

export function buildRecallNotificationInsert(input: {
  notification: RecallableNotificationRecord;
  channel: NotificationFallbackChannel;
  now: string;
}) {
  const metadata = parseNotificationReachMetadata(input.notification.metadata);

  return {
    user_id: input.notification.user_id,
    type: input.notification.type,
    title: input.notification.title,
    content: input.notification.content,
    link_to: input.notification.link_to,
    reach_channel: input.channel,
    delivery_status: "sent" as const,
    delivered_at: input.now,
    recall_count: 0,
    recall_of_notification_id: input.notification.id,
    metadata: {
      ...input.notification.metadata,
      event_key: metadata.event_key,
      audience_role: metadata.audience_role,
      recall_channel: input.channel,
    },
  };
}
