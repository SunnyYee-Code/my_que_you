import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { nickname, email, phone } = await req.json();
    if (!nickname && !email && !phone) throw new Error("Missing nickname, email or phone");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (phone) {
      // Lookup by phone number in profiles table
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .order("created_at", { ascending: true })
        .limit(1);
      const profile = profiles?.[0];
      if (!profile) throw new Error("User not found");

      const { data: { user } } = await adminClient.auth.admin.getUserById(profile.id);
      if (!user?.email) throw new Error("User has no email");

      return new Response(JSON.stringify({ email: user.email, user_id: profile.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (nickname) {
      // Lookup by nickname
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id")
        .eq("nickname", nickname)
        .order("created_at", { ascending: true })
        .limit(1);
      const profile = profiles?.[0];
      if (!profile) throw new Error("User not found");

      const { data: { user } } = await adminClient.auth.admin.getUserById(profile.id);
      if (!user?.email) throw new Error("User has no email");

      return new Response(JSON.stringify({ email: user.email, user_id: profile.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lookup by email - find user in auth then get profile
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const authUser = (users || []).find((u: any) => u.email === email);
    if (!authUser) throw new Error("User not found");

    return new Response(JSON.stringify({ email, user_id: authUser.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
