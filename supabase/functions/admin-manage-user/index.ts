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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const roles = (callerRoles || []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");
    const isSuperAdmin = roles.includes("super_admin");

    if (!isAdmin) throw new Error("Forbidden");

    const body = await req.json();
    const { action } = body;

    // Create user - SUPER ADMIN ONLY
    if (action === "create_user") {
      if (!isSuperAdmin) throw new Error("只有超级管理员可以创建用户");

      const { password, nickname, role } = body;
      let { email } = body;
      if (!password) throw new Error("密码必填");

      // For test role, auto-generate email if not provided
      if (role === "test" && !email) {
        const ts = Date.now().toString(36);
        email = `test_${ts}@test.com`;
      }
      if (!email) throw new Error("邮箱必填");

      // Check email not already registered
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const existing = (users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (existing) throw new Error("该邮箱已被注册");

      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nickname },
      });
      if (createErr) throw createErr;

      await adminClient.from("profiles").update({ nickname }).eq("id", newUser.user.id);

      if (role === "admin" || role === "test") {
        await adminClient.from("user_roles").update({ role }).eq("user_id", newUser.user.id);
      }

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete user - SUPER ADMIN ONLY
    if (action === "delete_user") {
      if (!isSuperAdmin) throw new Error("只有超级管理员可以删除用户");

      const { user_id } = body;
      if (!user_id) throw new Error("缺少用户ID");
      if (user_id === callerId) throw new Error("不能删除自己");

      const { data: targetRoles } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user_id);
      const targetRoleList = (targetRoles || []).map((r: any) => r.role);

      // Cannot delete super_admin or admin
      if (targetRoleList.includes("super_admin")) {
        throw new Error("不能删除超级管理员");
      }
      if (targetRoleList.includes("admin")) {
        throw new Error("不能删除管理员");
      }

      // Record email in deleted_emails before deletion
      const { data: { user: targetUser } } = await adminClient.auth.admin.getUserById(user_id);
      if (targetUser?.email) {
        await adminClient.from("deleted_emails").insert({
          user_id,
          email: targetUser.email.toLowerCase(),
        });
      }

      await adminClient.auth.admin.deleteUser(user_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ban/unban user - SUPER ADMIN ONLY
    if (action === "ban_user") {
      if (!isSuperAdmin) throw new Error("只有超级管理员可以封禁用户");

      const { user_id, is_banned } = body;
      if (!user_id) throw new Error("缺少用户ID");

      await adminClient.from("profiles").update({ is_banned }).eq("id", user_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reset password
    if (action === "reset_password") {
      const { user_id, new_password } = body;
      if (!user_id) throw new Error("缺少用户ID");
      if (!new_password || new_password.length < 6) throw new Error("密码至少6位");

      // Check target is test or normal user (not admin/super_admin)
      const { data: targetRoles } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user_id);
      const targetRoleList = (targetRoles || []).map((r: any) => r.role);
      if (targetRoleList.includes("super_admin")) throw new Error("不能修改超级管理员密码");
      if (targetRoleList.includes("admin") && !isSuperAdmin) throw new Error("只有超级管理员可以修改管理员密码");

      const { error: pwErr } = await adminClient.auth.admin.updateUserById(user_id, { password: new_password });
      if (pwErr) throw pwErr;

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
