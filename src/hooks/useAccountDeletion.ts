import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_ACCOUNT_DELETION_SNAPSHOT, type AccountDeletionSnapshot } from '@/constants/accountDeletion';

const ACCOUNT_DELETION_QUERY_KEY = ['account-deletion-status'];

async function invokeAccountDeletion<T>(action: 'status' | 'apply' | 'cancel', method: 'GET' | 'POST'): Promise<T> {
  const response = await fetch(`/functions/v1/account-deletion/${action}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: method === 'POST' ? JSON.stringify({}) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.message || '请求失败，请稍后重试') as Error & { code?: string };
    error.code = payload?.code;
    throw error;
  }

  return payload as T;
}

export function useAccountDeletionStatus() {
  return useQuery({
    queryKey: ACCOUNT_DELETION_QUERY_KEY,
    queryFn: async () => {
      const payload = await invokeAccountDeletion<Partial<AccountDeletionSnapshot> & { updatedAt?: string; availableActions?: string[] }>('status', 'GET');
      return {
        ...DEFAULT_ACCOUNT_DELETION_SNAPSHOT,
        ...payload,
      } satisfies AccountDeletionSnapshot;
    },
    retry: false,
  });
}

export function useApplyAccountDeletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => invokeAccountDeletion<AccountDeletionSnapshot & { updatedAt?: string; availableActions?: string[] }>('apply', 'POST'),
    onSuccess: (data) => {
      queryClient.setQueryData(ACCOUNT_DELETION_QUERY_KEY, {
        ...DEFAULT_ACCOUNT_DELETION_SNAPSHOT,
        ...data,
      });
    },
  });
}

export function useCancelAccountDeletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => invokeAccountDeletion<AccountDeletionSnapshot & { updatedAt?: string; availableActions?: string[] }>('cancel', 'POST'),
    onSuccess: (data) => {
      queryClient.setQueryData(ACCOUNT_DELETION_QUERY_KEY, {
        ...DEFAULT_ACCOUNT_DELETION_SNAPSHOT,
        ...data,
      });
    },
  });
}
