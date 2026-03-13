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

      // Notify host
      const title = newStatus === "COMPLETED" ? "拼团已完成" : "拼团已过期";
      const content = newStatus === "COMPLETED"
        ? `您的拼团「${group.address}」已自动标记为完成`
        : `您的拼团「${group.address}」已超过结束时间，自动关闭`;

      await admin.from("notifications").insert({
        user_id: group.host_id,
        type: "group_cancelled",
        title,
        content,
        link_to: `/groups/${group.id}`,
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
