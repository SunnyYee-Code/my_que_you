import type { NotificationFallbackChannel } from "./notification-reach.ts";

export interface NotificationChannelDeliveryInput {
  channel: Exclude<NotificationFallbackChannel, "in_app">;
  eventKey: string;
  audienceRole: string;
  notificationId: string;
  userId: string;
  title: string;
  content: string;
  linkTo: string | null;
  metadata: Record<string, unknown>;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}

export interface NotificationChannelDeliveryResult {
  ok: boolean;
  providerMessageId?: string;
  errorMessage?: string;
  responseStatus: number | null;
}

export function resolveNotificationChannelWebhookUrl(
  channel: Exclude<NotificationFallbackChannel, "in_app">,
  env: Record<string, string | undefined>,
) {
  const channelSpecificKey = channel === "subscription"
    ? "NOTIFICATION_SUBSCRIPTION_WEBHOOK_URL"
    : "NOTIFICATION_SMS_WEBHOOK_URL";

  return env[channelSpecificKey] ?? env.NOTIFICATION_DELIVERY_WEBHOOK_URL ?? null;
}

export async function deliverNotificationToChannel(
  input: NotificationChannelDeliveryInput,
): Promise<NotificationChannelDeliveryResult> {
  const env = input.env ?? {
    NOTIFICATION_DELIVERY_WEBHOOK_URL: Deno.env.get("NOTIFICATION_DELIVERY_WEBHOOK_URL"),
    NOTIFICATION_SUBSCRIPTION_WEBHOOK_URL: Deno.env.get("NOTIFICATION_SUBSCRIPTION_WEBHOOK_URL"),
    NOTIFICATION_SMS_WEBHOOK_URL: Deno.env.get("NOTIFICATION_SMS_WEBHOOK_URL"),
  };
  const webhookUrl = resolveNotificationChannelWebhookUrl(input.channel, env);

  if (!webhookUrl) {
    return {
      ok: false,
      errorMessage: `missing webhook configuration for ${input.channel}`,
      responseStatus: null,
    };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: input.channel,
      event_key: input.eventKey,
      audience_role: input.audienceRole,
      notification_id: input.notificationId,
      user_id: input.userId,
      title: input.title,
      content: input.content,
      link_to: input.linkTo,
      metadata: input.metadata,
    }),
  });

  let responsePayload: Record<string, unknown> | null = null;
  try {
    responsePayload = await response.json();
  } catch {
    responsePayload = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      errorMessage: typeof responsePayload?.error === "string"
        ? responsePayload.error
        : `delivery webhook returned ${response.status}`,
      responseStatus: response.status,
    };
  }

  return {
    ok: true,
    providerMessageId: typeof responsePayload?.provider_message_id === "string"
      ? responsePayload.provider_message_id
      : undefined,
    responseStatus: response.status,
  };
}
