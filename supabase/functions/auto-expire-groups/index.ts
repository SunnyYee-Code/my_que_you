import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    // Find groups that are past end_time but still in active statuses
    const { data: expiredGroups, error } = await admin
      .from("groups")
      .select("id, host_id, address, status")
      .in("status", ["OPEN", "FULL", "IN_PROGRESS"])
      .lt("end_time", now);

    if (error) throw error;
    if (!expiredGroups || expiredGroups.length === 0) {
      return new Response(JSON.stringify({ success: true, expired: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let expiredCount = 0;

    for (const group of expiredGroups) {
      // Determine new status: IN_PROGRESS -> COMPLETED, OPEN/FULL -> CANCELLED
      const newStatus = group.status === "IN_PROGRESS" ? "COMPLETED" : "CANCELLED";

      const { error: updateErr } = await admin
        .from("groups")
        .update({ status: newStatus })
        .eq("id", group.id);

      if (updateErr) {
        console.error(`Failed to update group ${group.id}:`, updateErr.message);
        continue;
      }

      // If completed, reward credit to host and members
      if (newStatus === "COMPLETED") {
        const { data: members } = await admin
          .from("group_members")
          .select("user_id")
          .eq("group_id", group.id);

        if (members) {
          for (const member of members) {
            // Add credit to profile
            const { data: profile } = await admin
              .from("profiles")
              .select("credit_score")
              .eq("id", member.user_id)
              .single();

            if (profile) {
              await admin
                .from("profiles")
                .update({ credit_score: profile.credit_score + 1 })
                .eq("id", member.user_id);

              // Record history
              await admin.from("credit_history").insert({
                user_id: member.user_id,
                change: 1,
                reason: "完成拼团奖励",
                group_id: group.id,
                can_appeal: false,
              });

              // Notify member
              await admin.from("notifications").insert({
                user_id: member.user_id,
                type: "credit_change",
                title: "信用分变动",
                content: `恭喜！完成拼团「${group.address}」，信用分 +1`,
                link_to: `/profile/${member.user_id}`,
              });
            }
          }
        }
      }

      // Notify host (if not already notified as member)
      const title = newStatus === "COMPLETED" ? "拼团已完成" : "拼团已过期";
      const content = newStatus === "COMPLETED"
        ? `您的拼团「${group.address}」已自动标记为完成`
        : `您的拼团「${group.address}」已超过结束时间，自动关闭`;

      // Host is already a member, so they get the credit notification. 
      // We can send an additional status notification or just skip if they are member.
      // To be safe, always send the status notification.
      await admin.from("notifications").insert({
        user_id: group.host_id,
        type: "group_cancelled", // Reuse type or use something else
        title,
        content,
        link_to: `/group/${group.id}`,
      });

      expiredCount++;
    }

    return new Response(JSON.stringify({ success: true, expired: expiredCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("auto-expire-groups error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
