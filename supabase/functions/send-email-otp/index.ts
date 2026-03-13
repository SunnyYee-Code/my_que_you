import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate a 6-digit numeric OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple hash (for storage - not cryptographic strength needed, just not plaintext)
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, type } = await req.json();
    if (!email || !type) throw new Error("email and type are required");
    if (!["register", "login"].includes(type)) throw new Error("type must be 'register' or 'login'");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Rate limit: max 3 OTPs per email per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentCodes } = await adminClient
      .from("email_otp_codes")
      .select("id")
      .eq("email", email.toLowerCase())
      .eq("type", type)
      .gte("created_at", tenMinutesAgo);

    if (recentCodes && recentCodes.length >= 3) {
      return new Response(JSON.stringify({
        error: "发送过于频繁，请10分钟后再试"
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate OTP
    const otp = generateOtp();
    const codeHash = await hashCode(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store in DB
    const { error: insertError } = await adminClient
      .from("email_otp_codes")
      .insert({
        email: email.toLowerCase(),
        code_hash: codeHash,
        type,
        expires_at: expiresAt,
      });

    if (insertError) throw new Error("Failed to store OTP: " + insertError.message);

    // Send via Resend
    const emailSubject = type === "register" ? "雀友聚 - 注册验证码" : "雀友聚 - 登录验证码";
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px;">🀄</span>
          <h1 style="font-size: 22px; color: #1a1a1a; margin: 8px 0 4px;">雀友聚</h1>
          <p style="color: #666; font-size: 14px; margin: 0;">娱乐约局，快乐拼团</p>
        </div>
        <div style="background: #f8f7f4; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: #444; font-size: 14px; margin: 0 0 16px;">您的${type === 'register' ? '注册' : '登录'}验证码为</p>
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #c04000; font-family: monospace;">${otp}</div>
          <p style="color: #888; font-size: 12px; margin: 16px 0 0;">验证码10分钟内有效，请勿泄露给他人</p>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin: 0;">如非本人操作，请忽略此邮件</p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "雀友聚 <noreply@resend.dev>",
        to: [email],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      throw new Error("Resend error: " + errBody);
    }

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
