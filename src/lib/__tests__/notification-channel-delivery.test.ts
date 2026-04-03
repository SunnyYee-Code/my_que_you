import { describe, expect, it, vi } from 'vitest';
import {
  deliverNotificationToChannel,
  resolveNotificationChannelWebhookUrl,
} from '../../../supabase/functions/_shared/notification-channel-delivery';

describe('notification channel delivery', () => {
  it('prefers channel specific webhook urls over the generic fallback', () => {
    expect(resolveNotificationChannelWebhookUrl('subscription', {
      NOTIFICATION_DELIVERY_WEBHOOK_URL: 'https://generic.example.com',
      NOTIFICATION_SUBSCRIPTION_WEBHOOK_URL: 'https://subscription.example.com',
    })).toBe('https://subscription.example.com');

    expect(resolveNotificationChannelWebhookUrl('sms', {
      NOTIFICATION_DELIVERY_WEBHOOK_URL: 'https://generic.example.com',
    })).toBe('https://generic.example.com');
  });

  it('posts the delivery payload to the configured webhook', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ provider_message_id: 'provider-1' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const result = await deliverNotificationToChannel({
      channel: 'subscription',
      eventKey: 'group_start_reminder',
      audienceRole: 'member',
      notificationId: 'notification-1',
      userId: 'user-1',
      title: '你加入的拼团即将开局',
      content: '请准时到场',
      linkTo: '/group/group-1',
      metadata: { group_id: 'group-1' },
      env: {
        NOTIFICATION_SUBSCRIPTION_WEBHOOK_URL: 'https://subscription.example.com',
      },
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({
      ok: true,
      providerMessageId: 'provider-1',
      responseStatus: 200,
    });
    expect(fetchMock).toHaveBeenCalledWith('https://subscription.example.com', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('returns a clear failure when no webhook is configured for the channel', async () => {
    const result = await deliverNotificationToChannel({
      channel: 'sms',
      eventKey: 'emergency_fill',
      audienceRole: 'host',
      notificationId: 'notification-1',
      userId: 'user-1',
      title: '紧急补位提醒',
      content: '当前仍差1人',
      linkTo: '/group/group-1',
      metadata: {},
      env: {},
      fetchImpl: vi.fn(),
    });

    expect(result).toEqual({
      ok: false,
      errorMessage: 'missing webhook configuration for sms',
      responseStatus: null,
    });
  });
});
