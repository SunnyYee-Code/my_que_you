import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Get current date in China timezone (UTC+8), considering 8am reset
function getChinaDate(): string {
  const now = new Date();
  // Convert to China time
  const chinaTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const hours = chinaTime.getUTCHours();
  
  // If before 8am China time, use previous day
  if (hours < 8) {
    chinaTime.setUTCDate(chinaTime.getUTCDate() - 1);
  }
  
  return chinaTime.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, phone, ip_address, action } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const currentDate = getChinaDate();

    if (action === "check_phone") {
      // Check if phone number is already registered
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .limit(1);

      if (profiles && profiles.length > 0) {
        return new Response(JSON.stringify({ 
          available: false, 
          message: "该手机号已被注册"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ available: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_registration") {
      // Check 1: Email not in deleted_emails within 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const { data: deletedEmail } = await adminClient
        .from("deleted_emails")
        .select("deleted_at")
        .eq("email", email.toLowerCase())
        .gte("deleted_at", threeDaysAgo.toISOString())
        .limit(1);

      if (deletedEmail && deletedEmail.length > 0) {
        const deletedAt = new Date(deletedEmail[0].deleted_at);
        const availableAt = new Date(deletedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
        return new Response(JSON.stringify({ 
          allowed: false, 
          error: "email_cooldown",
          message: `该邮箱已注销，${availableAt.toLocaleDateString('zh-CN')} 后可重新注册`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check 2: Email not already registered
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const existingUser = (users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return new Response(JSON.stringify({ 
          allowed: false, 
          error: "email_exists",
          message: "该邮箱已被注册"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check 3: IP rate limit for registration (1 per day)
      if (ip_address) {
        const { data: ipLimit } = await adminClient
          .from("ip_rate_limits")
          .select("registrations")
          .eq("ip_address", ip_address)
          .eq("date", currentDate)
          .single();

        if (ipLimit && ipLimit.registrations >= 1) {
          return new Response(JSON.stringify({ 
            allowed: false, 
            error: "ip_limit",
            message: "该IP今日注册次数已达上限，请明日8点后再试"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_login") {
      // Check IP rate limit for login (3 per day)
      if (ip_address) {
        const { data: ipLimit } = await adminClient
          .from("ip_rate_limits")
          .select("logins")
          .eq("ip_address", ip_address)
          .eq("date", currentDate)
          .single();

        if (ipLimit && ipLimit.logins >= 3) {
          return new Response(JSON.stringify({ 
            allowed: false, 
            error: "ip_limit",
            message: "该IP今日登录次数已达上限，请明日8点后再试"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "record_registration") {
      // Record successful registration
      if (ip_address) {
        await adminClient
          .from("ip_rate_limits")
          .upsert({
            ip_address,
            date: currentDate,
            registrations: 1,
            logins: 0,
          }, { 
            onConflict: "ip_address,date",
            ignoreDuplicates: false 
          });
        
        // Increment if exists
        await (adminClient.rpc("increment_ip_registrations", { 
          p_ip: ip_address, 
          p_date: currentDate 
        }) as any).catch?.(() => {
          // RPC might not exist yet
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "record_login") {
      // Record successful login
      if (ip_address) {
        const { data: existing } = await adminClient
          .from("ip_rate_limits")
          .select("id, logins")
          .eq("ip_address", ip_address)
          .eq("date", currentDate)
          .single();

        if (existing) {
          await adminClient
            .from("ip_rate_limits")
            .update({ logins: existing.logins + 1, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        } else {
          await adminClient
            .from("ip_rate_limits")
            .insert({ ip_address, date: currentDate, registrations: 0, logins: 1 });
        }
      }

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
