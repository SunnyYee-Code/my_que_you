import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import {
  GROUP_START_REMINDER_ADVANCE_MINUTES,
  buildGroupStartReminderNotification,
  buildGroupStartReminderPlans,
  deliverGroupStartReminder,
  resolveGroupStartReminderStatus,
  type GroupStartReminderGroupStatus,
  type GroupStartReminderPlan,
  type GroupStartReminderRole,
  type GroupStartReminderStatus,
  type ReminderDeliveryStore,
  type ReminderStoreRecord,
} from "../_shared/group-start-reminder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GroupRow {
  id: string;
  host_id: string;
  address: string;
  start_time: string;
  status: GroupStartReminderGroupStatus;
  total_slots: number;
  needed_slots: number;
  members: Array<{ user_id: string }> | null;
}

interface ReminderRow {
  id: string;
  group_id: string;
  user_id: string;
  recipient_role: GroupStartReminderRole;
  scheduled_start_time: string;
  remind_at: string;
  status: GroupStartReminderStatus;
  sent_at: string | null;
  group: Pick<GroupRow, "start_time" | "status"> | null;
}

function buildReminderKey(plan: GroupStartReminderPlan) {
  return `${plan.groupId}:${plan.userId}:${plan.role}:${plan.scheduledStartTime}`;
}

function toReminderStoreRecord(row: {
  id: string;
  group_id: string;
  user_id: string;
  recipient_role: GroupStartReminderRole;
  remind_at: string;
  scheduled_start_time: string;
  status: GroupStartReminderStatus;
  sent_at: string | null;
}): ReminderStoreRecord {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    role: row.recipient_role,
    remindAt: row.remind_at,
    scheduledStartTime: row.scheduled_start_time,
    status: row.status,
    sentAt: row.sent_at,
  };
}

function createReminderDeliveryStore(admin: ReturnType<typeof createClient>): ReminderDeliveryStore {
  return {
    async findByKey(plan) {
      const { data, error } = await admin
        .from("group_start_reminders")
        .select("id, group_id, user_id, recipient_role, remind_at, scheduled_start_time, status, sent_at")
        .eq("group_id", plan.groupId)
        .eq("user_id", plan.userId)
        .eq("recipient_role", plan.role)
        .eq("scheduled_start_time", plan.scheduledStartTime)
        .maybeSingle();

      if (error) throw error;
      return data ? toReminderStoreRecord(data as any) : null;
    },
    async createPending(plan) {
      const { data, error } = await admin
        .from("group_start_reminders")
        .insert({
          group_id: plan.groupId,
          user_id: plan.userId,
          recipient_role: plan.role,
          scheduled_start_time: plan.scheduledStartTime,
          remind_at: plan.remindAt,
          status: "pending",
        })
        .select("id, group_id, user_id, recipient_role, remind_at, scheduled_start_time, status, sent_at")
        .maybeSingle();

      if (error) return null;
      return data ? toReminderStoreRecord(data as any) : null;
    },
    async claimForSending(reminderId) {
      const { data, error } = await admin
        .from("group_start_reminders")
        .update({
          status: "sending",
          last_error: null,
        })
        .eq("id", reminderId)
        .in("status", ["pending", "failed"])
        .select("id, group_id, user_id, recipient_role, remind_at, scheduled_start_time, status, sent_at")
        .maybeSingle();

      if (error) throw error;
      return data ? toReminderStoreRecord(data as any) : null;
    },
    async sendNotification(input) {
      const { data, error } = await admin
        .from("notifications")
        .insert({
          user_id: input.userId,
          type: "group_start_reminder",
          title: input.title,
          content: input.content,
          link_to: `/group/${input.groupId}`,
        })
        .select("id")
        .single();

      if (error) throw error;
      return { id: data.id as string };
    },
    async markSent(input) {
      const { data, error } = await admin
        .from("group_start_reminders")
        .update({
          status: "sent",
          sent_at: input.sentAt,
          last_error: null,
          notification_id: input.notificationId,
        })
        .eq("id", input.reminderId)
        .eq("status", "sending")
        .select("id")
        .maybeSingle();

      if (error) {
        console.error(`Failed to mark reminder ${input.reminderId} sent:`, error.message);
        return false;
      }

      return Boolean(data);
    },
    async markFailed(input) {
      const { error } = await admin
        .from("group_start_reminders")
        .update({
          status: "failed",
          last_error: input.errorMessage,
        })
        .eq("id", input.reminderId);

      if (error) {
        console.error(`Failed to mark reminder ${input.reminderId} failed:`, error.message);
      }
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const store = createReminderDeliveryStore(admin);

    const now = new Date();
    const nowIso = now.toISOString();
    const dueWindowEndIso = new Date(
      now.getTime() + GROUP_START_REMINDER_ADVANCE_MINUTES * 60 * 1000,
    ).toISOString();

    const { data: trackedReminders, error: trackedError } = await admin
      .from("group_start_reminders")
      .select(`
        id,
        group_id,
        user_id,
        recipient_role,
        remind_at,
        scheduled_start_time,
        status,
        sent_at,
        group:groups(start_time, status)
      `)
      .in("status", ["pending", "failed", "sending"]);

    if (trackedError) throw trackedError;

    const trackedMap = new Map<string, ReminderStoreRecord>();

    for (const reminder of (trackedReminders ?? []) as ReminderRow[]) {
      const nextStatus = resolveGroupStartReminderStatus({
        currentStatus: reminder.status,
        groupStatus: reminder.group?.status ?? "CANCELLED",
        scheduledStartTime: reminder.scheduled_start_time,
        latestStartTime: reminder.group?.start_time ?? reminder.scheduled_start_time,
        sentAt: reminder.sent_at,
      });

      if (nextStatus !== reminder.status) {
        const { error: updateError } = await admin
          .from("group_start_reminders")
          .update({
            status: nextStatus,
            last_error: nextStatus === "superseded"
              ? "group_start_time_changed"
              : nextStatus === "cancelled"
                ? "group_inactive"
                : null,
          })
          .eq("id", reminder.id);

        if (updateError) {
          console.error(`Failed to update reminder ${reminder.id}:`, updateError.message);
          continue;
        }

        reminder.status = nextStatus;
      }

      trackedMap.set(buildReminderKey({
        groupId: reminder.group_id,
        userId: reminder.user_id,
        role: reminder.recipient_role,
        remindAt: reminder.remind_at,
        scheduledStartTime: reminder.scheduled_start_time,
      }), toReminderStoreRecord(reminder as any));
    }

    const { data: groups, error: groupsError } = await admin
      .from("groups")
      .select(`
        id,
        host_id,
        address,
        start_time,
        status,
        total_slots,
        needed_slots,
        members:group_members(user_id)
      `)
      .in("status", ["OPEN", "FULL"])
      .gt("start_time", nowIso)
      .lte("start_time", dueWindowEndIso);

    if (groupsError) throw groupsError;

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const group of (groups ?? []) as GroupRow[]) {
      const plans = buildGroupStartReminderPlans({
        groupId: group.id,
        hostId: group.host_id,
        memberIds: (group.members ?? []).map((member) => member.user_id),
        startTime: group.start_time,
        status: group.status,
      });

      for (const plan of plans) {
        const tracked = trackedMap.get(buildReminderKey(plan));
        if (tracked?.status === "sent" || tracked?.status === "sending") {
          skipped += 1;
          continue;
        }

        const joinedCount = group.total_slots - group.needed_slots;
        const notification = buildGroupStartReminderNotification({
          role: plan.role,
          address: group.address,
          neededSlots: group.needed_slots,
          totalSlots: group.total_slots,
          joinedCount,
          groupId: group.id,
        });

        const result = await deliverGroupStartReminder({
          plan,
          now,
          store,
          notification: {
            userId: plan.userId,
            title: notification.title,
            content: notification.content,
            groupId: group.id,
          },
        });

        if (result.outcome === "sent") {
          sent += 1;
          trackedMap.set(buildReminderKey(plan), {
            id: result.reminderId,
            ...plan,
            status: "sent",
            sentAt: now.toISOString(),
          });
          continue;
        }

        if (result.outcome === "failed") {
          failed += 1;
          continue;
        }

        skipped += 1;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sent,
      failed,
      skipped,
      dueGroups: groups?.length ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("auto-send-group-start-reminders error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
