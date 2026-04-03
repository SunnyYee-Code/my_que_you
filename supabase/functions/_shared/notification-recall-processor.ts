import {
  buildRecallNotificationInsert,
  isRecallWithinFrequencyWindow,
  parseNotificationReachMetadata,
  shouldScheduleNotificationRecall,
  type RecallableNotificationRecord,
} from "./notification-reach.ts";

export interface NotificationRecallStore {
  listPrimaryNotifications(): Promise<RecallableNotificationRecord[]>;
  getLatestRecall(notificationId: string): Promise<{ id: string; created_at: string } | null>;
  getCurrentNotificationState(notificationId: string): Promise<Pick<RecallableNotificationRecord, "read" | "read_at" | "clicked_at"> | null>;
  insertRecall(payload: ReturnType<typeof buildRecallNotificationInsert>): Promise<{ id: string | null; duplicate: boolean }>;
  deliverRecall(input: {
    recallId: string;
    notification: RecallableNotificationRecord;
    channel: string;
    now: string;
  }): Promise<{ status: "sent" | "failed"; deliveredAt?: string; errorMessage?: string }>;
  incrementRecallCount(notificationId: string, nextRecallCount: number): Promise<void>;
  logRecallFailure(input: {
    notification: RecallableNotificationRecord;
    channel: string;
    errorMessage: string;
  }): Promise<void>;
}

export async function processNotificationRecalls(input: {
  now?: Date;
  store: NotificationRecallStore;
}) {
  const now = input.now ?? new Date();
  const notifications = await input.store.listPrimaryNotifications();
  const recallsCreated: string[] = [];

  for (const notification of notifications) {
    if (!shouldScheduleNotificationRecall(notification, now)) continue;

    const metadata = parseNotificationReachMetadata(notification.metadata);
    const nextChannel = metadata.fallback_channels?.[notification.recall_count];
    if (!nextChannel) continue;

    const latestRecall = await input.store.getLatestRecall(notification.id);
    if (isRecallWithinFrequencyWindow({
      previousSentAt: latestRecall?.created_at ?? null,
      frequencyWindowMinutes: metadata.frequency_window_minutes,
      now,
    })) {
      continue;
    }

    const currentState = await input.store.getCurrentNotificationState(notification.id);
    if (currentState?.read || currentState?.read_at || currentState?.clicked_at) {
      continue;
    }

    const recallPayload = buildRecallNotificationInsert({
      notification,
      channel: nextChannel,
      now: now.toISOString(),
      deliveryStatus: "pending",
    });

    let insertedRecall: { id: string | null; duplicate: boolean };
    try {
      insertedRecall = await input.store.insertRecall(recallPayload);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "unknown_recall_insert_error";
      await input.store.logRecallFailure({
        notification,
        channel: nextChannel,
        errorMessage,
      });
      continue;
    }

    if (insertedRecall.id) {
      try {
        const deliveryResult = await input.store.deliverRecall({
          recallId: insertedRecall.id,
          notification,
          channel: nextChannel,
          now: now.toISOString(),
        });

        if (deliveryResult.status === "sent") {
          recallsCreated.push(insertedRecall.id);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "unknown_recall_delivery_error";
        await input.store.logRecallFailure({
          notification,
          channel: nextChannel,
          errorMessage,
        });
      }
    }

    if (insertedRecall.id || insertedRecall.duplicate) {
      await input.store.incrementRecallCount(notification.id, notification.recall_count + 1);
    }
  }

  return { recallsCreated };
}

export type { RecallableNotificationRecord } from "./notification-reach.ts";
