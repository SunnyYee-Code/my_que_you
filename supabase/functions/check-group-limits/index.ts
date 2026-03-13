import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Get current date in China timezone (UTC+8), considering 8am reset
function getChinaDate(): string {
  const now = new Date();
  const chinaTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const hours = chinaTime.getUTCHours();
  
  if (hours < 8) {
    chinaTime.setUTCDate(chinaTime.getUTCDate() - 1);
  }
  
  return chinaTime.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing auth");

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");
    const userId = claimsData.claims.sub;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { action } = await req.json();
    const currentDate = getChinaDate();

    // Get user's limits from profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("daily_create_limit, daily_join_limit")
      .eq("id", userId)
      .single();

    const createLimit = profile?.daily_create_limit ?? 5;
    const joinLimit = profile?.daily_join_limit ?? 5;

    // Get or create today's actions record
    let { data: actions } = await adminClient
      .from("user_daily_actions")
      .select("id, groups_created, groups_joined")
      .eq("user_id", userId)
      .eq("date", currentDate)
      .single();

    if (!actions) {
      const { data: newActions } = await adminClient
        .from("user_daily_actions")
        .insert({ user_id: userId, date: currentDate, groups_created: 0, groups_joined: 0 })
        .select()
        .single();
      actions = newActions;
    }

    if (action === "check_create") {
      const canCreate = (actions?.groups_created ?? 0) < createLimit;
      return new Response(JSON.stringify({ 
        allowed: canCreate,
        current: actions?.groups_created ?? 0,
        limit: createLimit,
        message: canCreate ? null : `今日创建团数已达上限(${createLimit}个)，请明日8点后再试`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_join") {
      const canJoin = (actions?.groups_joined ?? 0) < joinLimit;
      return new Response(JSON.stringify({ 
        allowed: canJoin,
        current: actions?.groups_joined ?? 0,
        limit: joinLimit,
        message: canJoin ? null : `今日参与团数已达上限(${joinLimit}个)，请明日8点后再试`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "record_create") {
      await adminClient
        .from("user_daily_actions")
        .update({ 
          groups_created: (actions?.groups_created ?? 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", actions?.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "record_join") {
      await adminClient
        .from("user_daily_actions")
        .update({ 
          groups_joined: (actions?.groups_joined ?? 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", actions?.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
