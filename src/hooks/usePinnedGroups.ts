/**
 * Pinned Groups Hooks
 *
 * Provides admin operations for managing pinned groups.
 * V3 Implementation: Admin-controlled pinning only (no user self-service).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validatePinningOperation } from '@/lib/pinned-groups';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Admin hook: Pin a group for increased visibility
 */
export function usePinGroup() {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const validation = validatePinningOperation(isSuperAdmin, groupId);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid pinning operation');
      }

      const { error } = await supabase
        .from('groups')
        .update({
          is_pinned: true,
          pinned_at: new Date().toISOString(),
        })
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['admin-groups-full'] });
      toast({
        title: '成功',
        description: '群组已置顶',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error instanceof Error ? error.message : '置顶群组失败',
      });
    },
  });
}

/**
 * Admin hook: Unpin a group
 */
export function useUnpinGroup() {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const validation = validatePinningOperation(isSuperAdmin, groupId);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid unpinning operation');
      }

      const { error } = await supabase
        .from('groups')
        .update({
          is_pinned: false,
          pinned_at: null,
        })
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['admin-groups-full'] });
      toast({
        title: '成功',
        description: '群组置顶已取消',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error instanceof Error ? error.message : '取消置顶失败',
      });
    },
  });
}
