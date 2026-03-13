import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller using getClaims
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing auth");

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");
    const callerId = claimsData.claims.sub;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerRoles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const isAdmin = (callerRoles || []).some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) throw new Error("Only admin can batch create users");

    const { prefix = "test", count = 10, password = "123456" } = await req.json();

    const created: string[] = [];
    const skipped: string[] = [];

    // List existing users once
    const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existingEmails = new Set((existing?.users || []).map((u: any) => u.email));

    for (let i = 1; i <= count; i++) {
      const num = String(i).padStart(3, "0");
      const nickname = `${prefix}${num}`;
      const email = `${nickname}@test.com`;

      if (existingEmails.has(email)) {
        skipped.push(nickname);
        continue;
      }

      const { data: newUser, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nickname },
      });

      if (error) {
        skipped.push(`${nickname}: ${error.message}`);
        continue;
      }

      await admin.from("profiles").update({ nickname }).eq("id", newUser.user.id);
      // Set test role
      await admin.from("user_roles").update({ role: "test" }).eq("user_id", newUser.user.id);
      created.push(nickname);
    }

    return new Response(JSON.stringify({
      success: true,
      created: created.length,
      skipped: skipped.length,
      created_users: created,
      skipped_users: skipped,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
