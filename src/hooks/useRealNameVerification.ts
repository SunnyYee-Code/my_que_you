import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adaptRealNameSnapshot } from '@/constants/realName';
import { supabase } from '@/integrations/supabase/client';
import { createDefaultRealNameSnapshot, type RealNameVerificationSnapshot } from '@/lib/real-name-verification';

type SubmitRealNamePayload = {
  real_name: string;
  id_number: string;
  consent_checked: boolean;
};

const REAL_NAME_QUERY_KEY = ['real-name-verification'];

async function invokeRealNameVerification<T>(action: 'status' | 'submit' | 'cancel', method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error('请先登录');
  }

  const response = await fetch(`/functions/v1/real-name-verification/${action}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || '请求失败，请稍后重试') as Error & { code?: string };
    error.code = payload?.code;
    throw error;
  }

  return payload as T;
}

export function useRealNameVerification() {
  return useQuery<RealNameVerificationSnapshot>({
    queryKey: REAL_NAME_QUERY_KEY,
    queryFn: async () => {
      const payload = await invokeRealNameVerification<Record<string, unknown>>('status', 'GET');
      return adaptRealNameSnapshot(payload);
    },
    retry: false,
  });
}

export function useSubmitRealNameVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SubmitRealNamePayload) => {
      const snapshot = await invokeRealNameVerification<Record<string, unknown>>('submit', 'POST', payload);
      return adaptRealNameSnapshot(snapshot);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(REAL_NAME_QUERY_KEY, {
        ...createDefaultRealNameSnapshot(),
        ...data,
      });
    },
  });
}

export function useCancelRealNameVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const snapshot = await invokeRealNameVerification<Record<string, unknown>>('cancel', 'POST', {});
      return adaptRealNameSnapshot(snapshot);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(REAL_NAME_QUERY_KEY, {
        ...createDefaultRealNameSnapshot(),
        ...data,
      });
    },
  });
}
