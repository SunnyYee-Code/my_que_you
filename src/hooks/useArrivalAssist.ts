// T16 4.4.2 到场辅助链路 Hook

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VenueHint } from '@/lib/arrival-assist';

/**
 * 房主更新拼团场地补充说明（到场辅助信息）
 */
export function useUpdateVenueHint(groupId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hint: VenueHint | null) => {
      if (!groupId) throw new Error('groupId 缺失');
      const { error } = await supabase
        .from('groups')
        .update({ venue_hint: hint as any })
        .eq('id', groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
}
