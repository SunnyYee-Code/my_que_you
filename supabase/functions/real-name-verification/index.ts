import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import {
  buildSnapshot,
  encryptSensitiveText,
  evaluateSubmission,
  maskIdNumber,
  REAL_NAME_STATUS,
  sha256Hex,
} from "../_shared/real-name.ts";
import { buildNotificationDeliveryLogInsert } from "../_shared/notification-delivery-log.ts";
import { buildRealNameNotificationInsert } from "../_shared/real-name-notification.ts";

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
      return jsonResponse(await getSnapshot(admin, userId));
    }

    if (req.method === "POST" && action === "submit") {
      const body = await req.json().catch(() => ({}));
      return jsonResponse(await submitVerification(admin, userId, body));
    }

    if (req.method === "POST" && action === "cancel") {
      return jsonResponse(await cancelVerification(admin, userId));
    }

    throw httpError(404, "NOT_FOUND", "接口不存在");
  } catch (error) {
    console.error("real-name-verification error:", error);
    if (isHttpError(error)) {
      return jsonResponse({ code: error.code, message: error.message }, error.status);
    }
    return jsonResponse({ code: "INTERNAL_ERROR", message: "系统繁忙，请稍后重试" }, 500);
  }
});

async function getSnapshot(admin: ReturnType<typeof createClient>, userId: string) {
  const profile = await fetchProfile(admin, userId);
  const request = await fetchLatestRequest(admin, userId);
  return buildSnapshotFromRows(profile, request);
}

async function submitVerification(admin: ReturnType<typeof createClient>, userId: string, body: any) {
  const realName = String(body?.real_name ?? "").trim();
  const idNumber = String(body?.id_number ?? "").trim().toUpperCase();
  const consentChecked = Boolean(body?.consent_checked);

  if (!realName || !idNumber) throw httpError(400, "INVALID_INPUT", "真实姓名和身份证号均为必填项");
  if (!consentChecked) throw httpError(400, "CONSENT_REQUIRED", "请先勾选认证授权");

  const [profile, latestRequest] = await Promise.all([
    fetchProfile(admin, userId),
    fetchLatestRequest(admin, userId),
  ]);

  if (latestRequest?.status === REAL_NAME_STATUS.PENDING) {
    throw httpError(409, "REAL_NAME_PENDING_EXISTS", "当前已有待审核实名认证申请");
  }

  if (![REAL_NAME_STATUS.UNVERIFIED, REAL_NAME_STATUS.CANCELLED, REAL_NAME_STATUS.REJECTED].includes(profile.real_name_status)) {
    throw httpError(409, "REAL_NAME_INVALID_STATUS", "当前状态不可重复提交实名认证");
  }

  const idNumberHash = await sha256Hex(idNumber);
  const [duplicateCheck, reportCheck] = await Promise.all([
    admin
      .from("real_name_verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("id_number_hash", idNumberHash)
      .neq("user_id", userId),
    admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_id", userId)
      .eq("status", "pending"),
  ]);

  const decision = evaluateSubmission({
    idNumber,
    duplicateIdHashCount: duplicateCheck.count ?? 0,
    reportedUser: (reportCheck.count ?? 0) > 0,
  });

  const now = new Date().toISOString();
  const requestStatus = decision.decision;
  const requestPayload = {
    user_id: userId,
    status: requestStatus,
    submit_source: "settings",
    real_name_encrypted: await encryptSensitiveText(realName),
    id_number_masked: maskIdNumber(idNumber),
    id_number_hash: idNumberHash,
    contact_phone_snapshot: profile.phone,
    material_payload: {
      consent_checked: true,
    },
    risk_flags: decision.riskFlags,
    review_result_code: decision.rejectReasonCode,
    review_result_message: decision.rejectReasonText,
    reviewed_at: requestStatus === REAL_NAME_STATUS.APPROVED || requestStatus === REAL_NAME_STATUS.REJECTED ? now : null,
    submitted_at: now,
  };

  const { data: request, error: requestError } = await admin
    .from("real_name_verification_requests")
    .insert(requestPayload)
    .select("*")
    .single();
  if (requestError) throw requestError;

  const profilePatch = {
    real_name_status: requestStatus,
    real_name_verified_at: requestStatus === REAL_NAME_STATUS.APPROVED ? now : null,
    real_name_request_id: request.id,
    real_name_reject_reason_code: decision.rejectReasonCode,
    real_name_reject_reason_text: decision.rejectReasonText,
    real_name_review_required: decision.reviewRequired,
    real_name_last_submitted_at: now,
    updated_at: now,
  };

  const { error: profileError } = await admin
    .from("profiles")
    .update(profilePatch)
    .eq("id", userId);
  if (profileError) throw profileError;

  await Promise.all([
    createAudit(admin, {
      requestId: request.id,
      userId,
      action: profile.real_name_status === REAL_NAME_STATUS.REJECTED ? "resubmit" : "submit",
      fromStatus: profile.real_name_status,
      toStatus: requestStatus,
      operatorType: "user",
      operatorId: userId,
      reasonCode: decision.rejectReasonCode,
      reasonText: decision.rejectReasonText,
      metadata: { riskFlags: decision.riskFlags },
    }),
    createNotification(
      admin,
      userId,
      requestStatus === REAL_NAME_STATUS.APPROVED ? "real_name_approved" : requestStatus === REAL_NAME_STATUS.REJECTED ? "real_name_rejected" : "real_name_submitted",
      requestStatus === REAL_NAME_STATUS.APPROVED ? "实名认证已通过" : requestStatus === REAL_NAME_STATUS.REJECTED ? "实名认证未通过" : "实名认证提交成功",
      requestStatus === REAL_NAME_STATUS.APPROVED
        ? "你的实名认证已自动通过审核。"
        : requestStatus === REAL_NAME_STATUS.REJECTED
          ? (decision.rejectReasonText ?? "请根据驳回原因修正后重新提交。")
          : "资料已提交，等待平台审核。",
    ),
  ]);

  return buildSnapshot({
    status: requestStatus,
    verifiedAt: profilePatch.real_name_verified_at,
    lastSubmittedAt: now,
    requestId: request.id,
    reviewRequired: decision.reviewRequired,
    rejectReasonCode: decision.rejectReasonCode,
    rejectReasonText: decision.rejectReasonText,
  });
}

async function cancelVerification(admin: ReturnType<typeof createClient>, userId: string) {
  const [profile, latestRequest] = await Promise.all([
    fetchProfile(admin, userId),
    fetchLatestRequest(admin, userId),
  ]);

  if (!latestRequest || latestRequest.status !== REAL_NAME_STATUS.PENDING) {
    throw httpError(409, "REAL_NAME_INVALID_CANCEL_STATUS", "当前状态不可撤回实名认证申请");
  }

  const now = new Date().toISOString();
  const { error: requestError } = await admin
    .from("real_name_verification_requests")
    .update({
      status: REAL_NAME_STATUS.CANCELLED,
      cancelled_at: now,
      review_result_code: null,
      review_result_message: null,
    })
    .eq("id", latestRequest.id)
    .eq("status", REAL_NAME_STATUS.PENDING);
  if (requestError) throw requestError;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      real_name_status: REAL_NAME_STATUS.UNVERIFIED,
      real_name_request_id: null,
      real_name_reject_reason_code: null,
      real_name_reject_reason_text: null,
      real_name_review_required: false,
      real_name_verified_at: null,
      updated_at: now,
    })
    .eq("id", userId);
  if (profileError) throw profileError;

  await createAudit(admin, {
    requestId: latestRequest.id,
    userId,
    action: "cancel",
    fromStatus: profile.real_name_status,
    toStatus: REAL_NAME_STATUS.CANCELLED,
    operatorType: "user",
    operatorId: userId,
    reasonCode: null,
    reasonText: null,
    metadata: {},
  });

  return buildSnapshot({
    status: REAL_NAME_STATUS.UNVERIFIED,
    verifiedAt: null,
    lastSubmittedAt: profile.real_name_last_submitted_at,
    requestId: null,
    reviewRequired: false,
    rejectReasonCode: null,
    rejectReasonText: null,
  });
}

async function fetchProfile(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, phone, real_name_status, real_name_verified_at, real_name_request_id, real_name_reject_reason_code, real_name_reject_reason_text, real_name_review_required, real_name_last_submitted_at")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

async function fetchLatestRequest(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from("real_name_verification_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function buildSnapshotFromRows(profile: any, request: any) {
  return buildSnapshot({
    status: profile.real_name_status ?? REAL_NAME_STATUS.UNVERIFIED,
    verifiedAt: profile.real_name_verified_at,
    lastSubmittedAt: profile.real_name_last_submitted_at,
    requestId: profile.real_name_request_id ?? request?.id ?? null,
    reviewRequired: Boolean(profile.real_name_review_required),
    rejectReasonCode: profile.real_name_reject_reason_code,
    rejectReasonText: profile.real_name_reject_reason_text,
  });
}

async function createAudit(admin: ReturnType<typeof createClient>, input: {
  requestId: string | null;
  userId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string;
  operatorType: "user" | "admin" | "system";
  operatorId: string | null;
  reasonCode: string | null;
  reasonText: string | null;
  metadata: Record<string, unknown>;
}) {
  const { error } = await admin.from("real_name_verification_audit_logs").insert({
    request_id: input.requestId,
    user_id: input.userId,
    action: input.action,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    operator_type: input.operatorType,
    operator_id: input.operatorId,
    reason_code: input.reasonCode,
    reason_text: input.reasonText,
    metadata: input.metadata,
  });
  if (error) throw error;
}

async function createNotification(admin: ReturnType<typeof createClient>, userId: string, type: string, title: string, content: string) {
  const now = new Date().toISOString();
  const { error } = await admin.from("notifications").insert(buildRealNameNotificationInsert({
    userId,
    type: type as "real_name_submitted" | "real_name_approved" | "real_name_rejected",
    title,
    content,
    deliveredAt: now,
  }));
  if (!error) return;

  const isReviewResult = type === "real_name_approved" || type === "real_name_rejected";
  await admin.from("notification_delivery_logs").insert(buildNotificationDeliveryLogInsert({
    userId,
    eventKey: isReviewResult ? "review_result" : "review_submission",
    audienceRole: "applicant",
    channel: "in_app",
    status: "failed",
    errorMessage: error.message,
    notificationType: type,
  }));
  throw error;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function httpError(status: number, code: string, message: string) {
  return { __httpError: true, status, code, message };
}

function isHttpError(error: unknown): error is { __httpError: true; status: number; code: string; message: string } {
  return Boolean(error && typeof error === "object" && "__httpError" in error);
}
