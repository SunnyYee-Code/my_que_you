import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, code, type, password, phone } = await req.json();
    if (!email || !code || !type) throw new Error("email, code, and type are required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const codeHash = await hashCode(code.trim());
    const now = new Date().toISOString();

    // Find a valid, unused OTP
    const { data: otpRows, error: fetchError } = await adminClient
      .from("email_otp_codes")
      .select("id")
      .eq("email", email.toLowerCase())
      .eq("type", type)
      .eq("code_hash", codeHash)
      .is("used_at", null)
      .gte("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) throw new Error("DB error: " + fetchError.message);

    if (!otpRows || otpRows.length === 0) {
      return new Response(JSON.stringify({ error: "验证码无效或已过期，请重新获取" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const otpId = otpRows[0].id;

    // Mark OTP as used
    await adminClient
      .from("email_otp_codes")
      .update({ used_at: now })
      .eq("id", otpId);

    // --- Registration flow ---
    if (type === "register") {
      if (!password) throw new Error("password is required for registration");

      // Check if user already exists in auth
      const { data: { users: existingUsers } } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

      let userId: string;

      if (existingUser) {
        // User exists but unconfirmed - confirm and update password
        const { error: updateErr } = await adminClient.auth.admin.updateUser(existingUser.id, {
          email_confirm: true,
          password,
        } as any);
        if (updateErr) throw new Error("Failed to confirm user: " + updateErr.message);
        userId = existingUser.id;
      } else {
        // Create new user with email already confirmed
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
          email: email.toLowerCase(),
          password,
          email_confirm: true,
        });
        if (createErr) throw new Error("Failed to create user: " + createErr.message);
        userId = newUser.user!.id;
      }

      // Update profile phone if provided
      if (phone) {
        await adminClient
          .from("profiles")
          .update({ phone })
          .eq("id", userId);
      }

      return new Response(JSON.stringify({ success: true, user_id: userId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Login/other flow ---
    // Just confirm that OTP was valid
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
