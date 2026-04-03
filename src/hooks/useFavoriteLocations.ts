import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  MAX_FAVORITE_LOCATIONS,
  type FavoriteLocationPayload,
  type FavoriteLocationRecord,
} from '@/lib/favorite-locations';

function favoriteLocationsKey(userId?: string) {
  return ['favorite-locations', userId];
}

export function useFavoriteLocations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: favoriteLocationsKey(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorite_locations')
        .select('*')
        .eq('user_id', user!.id);

      if (error) throw error;
      return (data ?? []) as FavoriteLocationRecord[];
    },
  });
}

export function useCreateFavoriteLocation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: FavoriteLocationPayload) => {
      if (!user) throw new Error('请先登录');

      const cached = queryClient.getQueryData<FavoriteLocationRecord[]>(favoriteLocationsKey(user.id)) ?? [];
      if (cached.length >= MAX_FAVORITE_LOCATIONS) {
        throw new Error(`最多收藏${MAX_FAVORITE_LOCATIONS}个常用地点`);
      }

      const note = input.note?.trim() ?? '';
      const { data, error } = await supabase
        .from('favorite_locations')
        .insert({
          user_id: user.id,
          city_id: input.city_id,
          city_name: input.city_name,
          name: input.name.trim(),
          address: input.address.trim(),
          latitude: input.latitude,
          longitude: input.longitude,
          note: note || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FavoriteLocationRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteLocationsKey(user?.id) });
    },
  });
}

export function useUpdateFavoriteLocation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<FavoriteLocationPayload>) => {
      if (!user) throw new Error('请先登录');

      const patch = {
        ...(updates.city_id ? { city_id: updates.city_id } : {}),
        ...(updates.city_name ? { city_name: updates.city_name } : {}),
        ...(updates.name ? { name: updates.name.trim() } : {}),
        ...(updates.address ? { address: updates.address.trim() } : {}),
        ...(typeof updates.latitude === 'number' ? { latitude: updates.latitude } : {}),
        ...(typeof updates.longitude === 'number' ? { longitude: updates.longitude } : {}),
        ...(updates.note !== undefined ? { note: updates.note.trim() || null } : {}),
      };

      const { data, error } = await supabase
        .from('favorite_locations')
        .update(patch)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as FavoriteLocationRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteLocationsKey(user?.id) });
    },
  });
}

export function useDeleteFavoriteLocation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('请先登录');

      const { error } = await supabase
        .from('favorite_locations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteLocationsKey(user?.id) });
    },
  });
}

export function useMarkFavoriteLocationUsed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) return;

      const { error } = await supabase
        .from('favorite_locations')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteLocationsKey(user?.id) });
    },
  });
}
