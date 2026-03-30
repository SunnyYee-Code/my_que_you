import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATUS = {
  COOLING_OFF: 'cooling_off',
  COMPLETED: 'completed',
} as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();
    const { data: expiredRequests, error } = await admin
      .from('account_deletion_requests')
      .select('id, user_id, status, cooling_off_expire_at, deleted_at')
      .eq('status', STATUS.COOLING_OFF)
      .is('deleted_at', null)
      .lte('cooling_off_expire_at', now);

    if (error) throw error;
    if (!expiredRequests || expiredRequests.length === 0) {
      return jsonResponse({ success: true, processed: 0, skipped: 0 });
    }

    let processed = 0;
    let skipped = 0;

    for (const request of expiredRequests) {
      try {
        const deletedAt = new Date().toISOString();
        const requestUpdate = {
          status: STATUS.COMPLETED,
          deleted_at: deletedAt,
          result_reason: '冷静期结束，系统已自动完成账号注销',
          forbidden_reason: null,
        };
        const profileUpdate = {
          is_banned: true,
          can_create_group: false,
          can_join_group: false,
          deletion_status: STATUS.COMPLETED,
          deletion_completed_at: deletedAt,
          deleted_at: deletedAt,
          nickname: '已注销用户',
          avatar_url: null,
          phone: null,
          city_id: null,
          onboarding_completed: false,
          require_email_verification: false,
          updated_at: deletedAt,
        };

        const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(request.user_id);
        if (authUserError) throw authUserError;
        const authUser = authUserData.user;
        const email = authUser?.email?.trim().toLowerCase();

        const { error: requestError } = await admin
          .from('account_deletion_requests')
          .update(requestUpdate)
          .eq('id', request.id)
          .eq('status', STATUS.COOLING_OFF);
        if (requestError) throw requestError;

        const { error: profileError } = await admin
          .from('profiles')
          .update(profileUpdate)
          .eq('id', request.user_id)
          .neq('deletion_status', STATUS.COMPLETED);
        if (profileError) throw profileError;

        if (email) {
          const { error: deletedEmailError } = await admin.from('deleted_emails').upsert({
            user_id: request.user_id,
            email,
            deleted_at: deletedAt,
          }, { onConflict: 'user_id' });
          if (deletedEmailError) throw deletedEmailError;
        }

        const mergedMetadata = {
          ...(authUser?.user_metadata ?? {}),
          nickname: '已注销用户',
          deletion_status: STATUS.COMPLETED,
          deleted: true,
          deleted_at: deletedAt,
        };

        const { error: authUpdateError } = await admin.auth.admin.updateUserById(request.user_id, {
          ban_duration: '876000h',
          user_metadata: mergedMetadata,
        });
        if (authUpdateError) throw authUpdateError;

        const { error: auditError } = await admin.from('account_deletion_audit_logs').insert({
          user_id: request.user_id,
          operator_id: null,
          action: 'auto_complete',
          detail: {
            fromStatus: STATUS.COOLING_OFF,
            toStatus: STATUS.COMPLETED,
            deletedAt,
            trigger: 'cron',
          },
        });
        if (auditError) throw auditError;

        const { error: notificationError } = await admin.from('notifications').insert({
          user_id: request.user_id,
          type: 'account_deletion',
          title: '账号已完成注销',
          content: '冷静期已结束，系统已自动完成账号注销处理。',
          link_to: '/settings',
        });
        if (notificationError) throw notificationError;

        processed += 1;
      } catch (loopError) {
        skipped += 1;
        console.error(`auto finalize deletion failed for ${request.user_id}:`, loopError);
      }
    }

    return jsonResponse({ success: true, processed, skipped });
  } catch (error: any) {
    console.error('auto-finalize-account-deletion error:', error?.message ?? error);
    return jsonResponse({ success: false, error: error?.message ?? 'unknown error' }, 400);
  }
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
