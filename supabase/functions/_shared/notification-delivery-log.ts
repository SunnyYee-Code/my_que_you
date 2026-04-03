export function buildNotificationDeliveryLogInsert(input: {
  userId: string;
  eventKey: string;
  audienceRole: string;
  channel: "in_app" | "subscription" | "sms";
  status: "sent" | "failed";
  errorMessage?: string | null;
  notificationType?: string | null;
  sourceNotificationId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return {
    user_id: input.userId,
    source_notification_id: input.sourceNotificationId ?? null,
    event_key: input.eventKey,
    audience_role: input.audienceRole,
    channel: input.channel,
    status: input.status,
    notification_type: input.notificationType ?? null,
    error_message: input.errorMessage ?? null,
    metadata: input.metadata ?? {},
  };
}
