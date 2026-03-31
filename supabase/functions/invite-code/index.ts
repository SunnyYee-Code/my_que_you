import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { bindInviteCodeForUser, getInviteCodeSnapshot, httpError, isHttpError } from "../_shared/invite-code.ts";

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

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw httpError(401, "UNAUTHORIZED", "缺少登录态");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) throw httpError(401, "UNAUTHORIZED", "登录态已失效");
    const userId = claimsData.claims.sub;

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const action = new URL(req.url).pathname.split("/").pop();

    if (req.method === "GET" && action === "status") {
      return jsonResponse(await getInviteCodeSnapshot(admin, userId));
    }

    if (req.method === "POST" && action === "bind") {
      const body = await req.json().catch(() => ({}));
      return jsonResponse(await bindInviteCodeForUser(admin, userId, String(body?.invite_code ?? ""), "settings"));
    }

    throw httpError(404, "NOT_FOUND", "接口不存在");
  } catch (error) {
    console.error("invite-code error:", error);
    if (isHttpError(error)) {
      return jsonResponse({ code: error.code, message: error.message }, error.status);
    }
    return jsonResponse({ code: "INTERNAL_ERROR", message: "系统繁忙，请稍后重试" }, 500);
  }
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
