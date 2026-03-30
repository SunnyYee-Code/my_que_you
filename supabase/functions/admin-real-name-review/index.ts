import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { buildSnapshot, REAL_NAME_STATUS } from "../_shared/real-name.ts";

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
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing auth");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) throw new Error("Unauthorized");
    const callerId = claimsData.claims.sub;

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const roles = (callerRoles || []).map((item: any) => item.role);
    if (!roles.includes("admin") && !roles.includes("super_admin")) throw new Error("Forbidden");

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const requestId = String(body?.request_id ?? "");
    const reasonCode = body?.reason_code ? String(body.reason_code) : null;
    const reasonText = body?.reason_text ? String(body.reason_text) : null;
    if (!requestId) throw new Error("缺少 request_id");
    if (action !== "approve" && action !== "reject") throw new Error("Unknown action");

    const { data: request, error: requestError } = await admin
      .from("real_name_verification_requests")
      .select("*")
      .eq("id", requestId)
      .single();
    if (requestError || !request) throw new Error("认证申请不存在");
    if (request.status !== REAL_NAME_STATUS.PENDING) throw new Error("仅待审核申请可执行审核");

    const nextStatus = action === "approve" ? REAL_NAME_STATUS.APPROVED : REAL_NAME_STATUS.REJECTED;
    const now = new Date().toISOString();

    const { error: updateRequestError } = await admin
      .from("real_name_verification_requests")
      .update({
        status: nextStatus,
        reviewed_by: callerId,
        reviewed_at: now,
        review_result_code: reasonCode,
        review_result_message: reasonText,
      })
      .eq("id", requestId)
      .eq("status", REAL_NAME_STATUS.PENDING);
    if (updateRequestError) throw updateRequestError;

    const { error: updateProfileError } = await admin
      .from("profiles")
      .update({
        real_name_status: nextStatus,
        real_name_verified_at: nextStatus === REAL_NAME_STATUS.APPROVED ? now : null,
        real_name_request_id: requestId,
        real_name_reject_reason_code: nextStatus === REAL_NAME_STATUS.REJECTED ? reasonCode : null,
        real_name_reject_reason_text: nextStatus === REAL_NAME_STATUS.REJECTED ? reasonText : null,
        real_name_review_required: false,
        updated_at: now,
      })
      .eq("id", request.user_id);
    if (updateProfileError) throw updateProfileError;

    const { error: auditError } = await admin
      .from("real_name_verification_audit_logs")
      .insert({
        request_id: requestId,
        user_id: request.user_id,
        action,
        from_status: REAL_NAME_STATUS.PENDING,
        to_status: nextStatus,
        operator_type: "admin",
        operator_id: callerId,
        reason_code: reasonCode,
        reason_text: reasonText,
        metadata: {},
      });
    if (auditError) throw auditError;

    const { error: notificationError } = await admin
      .from("notifications")
      .insert({
        user_id: request.user_id,
        type: action === "approve" ? "real_name_approved" : "real_name_rejected",
        title: action === "approve" ? "实名认证已通过" : "实名认证未通过",
        content: action === "approve" ? "你的实名认证已通过平台审核。" : (reasonText ?? "请根据驳回原因修正后重新提交。"),
        link_to: "/settings",
      });
    if (notificationError) throw notificationError;

    return new Response(JSON.stringify(buildSnapshot({
      status: nextStatus,
      verifiedAt: nextStatus === REAL_NAME_STATUS.APPROVED ? now : null,
      lastSubmittedAt: request.submitted_at,
      requestId,
      reviewRequired: false,
      rejectReasonCode: nextStatus === REAL_NAME_STATUS.REJECTED ? reasonCode : null,
      rejectReasonText: nextStatus === REAL_NAME_STATUS.REJECTED ? reasonText : null,
    })), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message ?? "unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
