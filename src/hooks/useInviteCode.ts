import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adaptInviteCodeSnapshot, createDefaultInviteCodeSnapshot, type InviteCodeSnapshot } from '@/lib/invite-code';

const INVITE_CODE_QUERY_KEY = ['invite-code-snapshot'];

async function invokeInviteCode<T>(action: 'status' | 'bind', method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error('请先登录');
  }

  const response = await fetch(`/functions/v1/invite-code/${action}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || '请求失败，请稍后重试');
  }

  return payload as T;
}

export function useInviteCodeSnapshot() {
  return useQuery<InviteCodeSnapshot>({
    queryKey: INVITE_CODE_QUERY_KEY,
    queryFn: async () => {
      const payload = await invokeInviteCode<Record<string, unknown>>('status', 'GET');
      return adaptInviteCodeSnapshot(payload);
    },
    retry: false,
  });
}

export function useBindInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteCode }: { inviteCode: string }) => {
      const payload = await invokeInviteCode<Record<string, unknown>>('bind', 'POST', {
        invite_code: inviteCode,
      });
      return adaptInviteCodeSnapshot(payload);
    },
    onSuccess: (snapshot) => {
      queryClient.setQueryData(INVITE_CODE_QUERY_KEY, {
        ...createDefaultInviteCodeSnapshot(),
        ...snapshot,
      });
    },
  });
}
