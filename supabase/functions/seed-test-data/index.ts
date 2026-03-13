// Seed test data edge function
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
    const callerId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerRoles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const isSuperAdmin = (callerRoles || []).some((r: any) => r.role === "super_admin");
    if (!isSuperAdmin) throw new Error("Only super_admin can seed data");

    // Create test users
    const testUsers = [
      { email: "majiang@test.com", nickname: "麻将达人", role: "user" },
      { email: "queshenwang@test.com", nickname: "雀神小王", role: "user" },
      { email: "kuailepai@test.com", nickname: "快乐牌友", role: "user" },
      { email: "adminli@test.com", nickname: "管理员小李", role: "admin" },
      { email: "xinshouwanjia@test.com", nickname: "新手玩家", role: "user" },
    ];

    const userIds: string[] = [];

    // List existing users once
    const { data: existingData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existingEmails = new Map((existingData?.users || []).map((u: any) => [u.email, u.id]));

    for (const tu of testUsers) {
      const existingId = existingEmails.get(tu.email);
      if (existingId) {
        userIds.push(existingId);
        continue;
      }

      const { data: newUser, error } = await admin.auth.admin.createUser({
        email: tu.email,
        password: "test123456",
        email_confirm: true,
        user_metadata: { nickname: tu.nickname },
      });
      if (error) throw new Error(`Failed to create ${tu.nickname}: ${error.message}`);
      
      await admin.from("profiles").update({ nickname: tu.nickname }).eq("id", newUser.user.id);
      
      if (tu.role === "admin") {
        await admin.from("user_roles").update({ role: "admin" }).eq("user_id", newUser.user.id);
      }
      userIds.push(newUser.user.id);
    }

    const superAdminId = callerId;
    const [user1, user2, user3, adminUser, user4] = userIds;

    const cityId = "chengdu";
    const now = new Date();
    const hour = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();

    const groupsToCreate = [
      {
        host_id: user1, city_id: cityId, status: "OPEN",
        address: "成都市武侯区天府大道100号棋牌室",
        start_time: hour(2), end_time: hour(5),
        total_slots: 4, needed_slots: 2, play_style: "血战到底",
        game_note: "新手友好，来玩就好",
        latitude: 30.5728, longitude: 104.0668,
      },
      {
        host_id: user2, city_id: cityId, status: "FULL",
        address: "成都市锦江区春熙路步行街旁茶馆",
        start_time: hour(3), end_time: hour(6),
        total_slots: 4, needed_slots: 0, play_style: "血流成河",
        game_note: "老玩家局，水平要求中等以上",
        latitude: 30.6571, longitude: 104.0817,
      },
      {
        host_id: adminUser, city_id: cityId, status: "IN_PROGRESS",
        address: "成都市青羊区宽窄巷子茶馆",
        start_time: hour(-1), end_time: hour(2),
        total_slots: 4, needed_slots: 0, play_style: "血战到底",
        game_note: "正在进行中，不接受新人",
        latitude: 30.6696, longitude: 104.0551,
      },
      {
        host_id: superAdminId, city_id: cityId, status: "COMPLETED",
        address: "成都市高新区天府软件园棋牌室",
        start_time: hour(-8), end_time: hour(-5),
        total_slots: 4, needed_slots: 0, play_style: "血战到底",
        game_note: "已结束的局",
        latitude: 30.5398, longitude: 104.0623,
      },
      {
        host_id: user3, city_id: cityId, status: "CANCELLED",
        address: "成都市成华区建设路附近",
        start_time: hour(10), end_time: hour(13),
        total_slots: 4, needed_slots: 3, play_style: "血流成河",
        game_note: "因故取消",
        latitude: 30.6623, longitude: 104.1037,
      },
      {
        host_id: user4, city_id: cityId, status: "OPEN",
        address: "成都市金牛区荷花池旁棋牌室",
        start_time: hour(24), end_time: hour(27),
        total_slots: 4, needed_slots: 3, play_style: "血战到底",
        game_note: "明天下午，新手也欢迎",
        latitude: 30.6910, longitude: 104.0658,
        is_visible: false,
      },
      {
        host_id: user1, city_id: "beijing", status: "OPEN",
        address: "北京市朝阳区三里屯茶楼",
        start_time: hour(5), end_time: hour(8),
        total_slots: 4, needed_slots: 1, play_style: "北京麻将",
        game_note: "三缺一，速来",
        latitude: 39.9334, longitude: 116.4537,
      },
    ];

    const createdGroupIds: string[] = [];

    for (const g of groupsToCreate) {
      const { data: group, error } = await admin.from("groups").insert(g).select("id").single();
      if (error) throw new Error(`Failed to create group: ${error.message}`);
      createdGroupIds.push(group.id);
      await admin.from("group_members").insert({ group_id: group.id, user_id: g.host_id });
    }

    await admin.from("group_members").insert([
      { group_id: createdGroupIds[1], user_id: user1 },
      { group_id: createdGroupIds[1], user_id: user3 },
      { group_id: createdGroupIds[1], user_id: user4 },
    ]);

    await admin.from("group_members").insert([
      { group_id: createdGroupIds[2], user_id: user1 },
      { group_id: createdGroupIds[2], user_id: user2 },
      { group_id: createdGroupIds[2], user_id: user3 },
    ]);

    await admin.from("group_members").insert([
      { group_id: createdGroupIds[3], user_id: user1 },
      { group_id: createdGroupIds[3], user_id: user2 },
      { group_id: createdGroupIds[3], user_id: user4 },
    ]);

    await admin.from("group_members").insert({ group_id: createdGroupIds[0], user_id: user3 });

    await admin.from("join_requests").insert([
      { group_id: createdGroupIds[0], user_id: user2, host_id: user1 },
      { group_id: createdGroupIds[0], user_id: user4, host_id: user1 },
    ]);

    await admin.from("join_requests").insert({
      group_id: createdGroupIds[1], user_id: superAdminId, host_id: user2, status: "PENDING",
    });

    await admin.from("group_members").insert([
      { group_id: createdGroupIds[6], user_id: user2 },
      { group_id: createdGroupIds[6], user_id: user3 },
    ]);

    return new Response(JSON.stringify({
      success: true,
      created_users: userIds.length,
      created_groups: createdGroupIds.length,
      message: "Test data seeded successfully",
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
