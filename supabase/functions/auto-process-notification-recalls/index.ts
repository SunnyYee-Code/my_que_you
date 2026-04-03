import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { buildNotificationDeliveryLogInsert } from "../_shared/notification-delivery-log.ts";
import {
  processNotificationRecalls,
  type RecallableNotificationRecord,
} from "../_shared/notification-recall-processor.ts";
import { parseNotificationReachMetadata } from "../_shared/notification-reach.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isAuthorizedRequest(authHeader: string | null, serviceRoleKey: string | null | undefined) {
  return Boolean(serviceRoleKey) && authHeader === `Bearer ${serviceRoleKey}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("authorization");

    if (!isAuthorizedRequest(authHeader, serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();
    const nowIso = now.toISOString();

    const result = await processNotificationRecalls({
      now,
      store: {
        async listPrimaryNotifications() {
          const { data, error } = await admin
            .from("notifications")
            .select("id, user_id, type, title, content, link_to, delivered_at, read, read_at, clicked_at, recall_count, metadata")
            .eq("delivery_status", "sent")
            .eq("read", false)
            .is("recall_of_notification_id", null);

          if (error) throw error;
          return (data ?? []) as RecallableNotificationRecord[];
        },
        async getLatestRecall(notificationId) {
          const { data, error } = await admin
            .from("notifications")
            .select("id, created_at")
            .eq("recall_of_notification_id", notificationId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) throw error;
          return data ? { id: data.id as string, created_at: data.created_at as string } : null;
        },
        async getCurrentNotificationState(notificationId) {
          const { data, error } = await admin
            .from("notifications")
            .select("read, read_at, clicked_at")
            .eq("id", notificationId)
            .maybeSingle();

          if (error) throw error;
          return data ? {
            read: Boolean(data.read),
            read_at: (data.read_at as string | null) ?? null,
            clicked_at: (data.clicked_at as string | null) ?? null,
          } : null;
        },
        async insertRecall(payload) {
          const { data, error } = await admin
            .from("notifications")
            .insert(payload)
            .select("id")
            .single();

          if (!error) {
            return { id: data.id as string, duplicate: false };
          }

          if (error.code === "23505") {
            return { id: null, duplicate: true };
          }

          throw error;
        },
        async incrementRecallCount(notificationId, nextRecallCount) {
          const { error } = await admin
            .from("notifications")
            .update({ recall_count: nextRecallCount })
            .eq("id", notificationId);

          if (error) throw error;
        },
        async logRecallFailure({ notification, channel, errorMessage }) {
          const metadata = parseNotificationReachMetadata(notification.metadata);
          const { error } = await admin
            .from("notification_delivery_logs")
            .insert(buildNotificationDeliveryLogInsert({
              userId: notification.user_id,
              eventKey: metadata.event_key ?? "unknown",
              audienceRole: metadata.audience_role ?? "unknown",
              channel: channel as "in_app" | "subscription" | "sms",
              status: "failed",
              errorMessage,
              notificationType: notification.type,
              sourceNotificationId: notification.id,
              metadata: {
                recall_count: notification.recall_count,
              },
            }));

          if (error) {
            console.error(`Failed to log recall delivery failure for ${notification.id}:`, error.message);
          }
        },
      },
    });

    return new Response(JSON.stringify({ recalls_created: result.recallsCreated.length, recall_ids: result.recallsCreated }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("auto-process-notification-recalls error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
