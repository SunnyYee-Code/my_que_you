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

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Find pending requests older than 1 hour
    const { data: staleRequests, error: fetchErr } = await admin
      .from("join_requests")
      .select("id, user_id, group_id")
      .eq("status", "PENDING")
      .lt("created_at", oneHourAgo);

    if (fetchErr) throw fetchErr;
    if (!staleRequests || staleRequests.length === 0) {
      return new Response(JSON.stringify({ success: true, released: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch update to REJECTED
    const ids = staleRequests.map(r => r.id);
    const { error: updateErr } = await admin
      .from("join_requests")
      .update({ status: "REJECTED", updated_at: new Date().toISOString() })
      .in("id", ids);

    if (updateErr) throw updateErr;

    // Notify each user
    for (const req of staleRequests) {
      await admin.from("notifications").insert({
        user_id: req.user_id,
        type: "application_update",
        title: "申请已过期",
        content: "您的拼团申请因房主未在1小时内处理，已自动失效",
        link_to: `/groups/${req.group_id}`,
      });
    }

    return new Response(JSON.stringify({ success: true, released: staleRequests.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("auto-release-requests error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
