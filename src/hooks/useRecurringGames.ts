/**
 * T15 4.3.5 长期局 — Supabase 数据 Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  RecurringGame,
  RecurringGameMember,
  RecurringGameMemberRole,
  RecurringGameMemberStatus,
  RecurringGameSession,
} from '@/lib/recurring-games';

// ─── 工具：行数据 → RecurringGame ────────────────────────────

function rowToGame(
  row: any,
  myRole: RecurringGameMemberRole | null = null,
  myStatus: RecurringGameMemberStatus | null = null
): RecurringGame {
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    description: row.description ?? null,
    locationName: row.location_name ?? null,
    weekday: row.weekday,
    startTime: row.start_time,
    maxMembers: row.max_members,
    memberCount: row.member_count,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    myRole,
    myStatus,
  };
}

// ─── 长期局列表（active 状态，含我的角色） ───────────────────

export function useRecurringGames() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recurring-games', 'list', user?.id ?? 'anon'],
    queryFn: async (): Promise<RecurringGame[]> => {
      const { data, error } = await supabase
        .from('recurring_games')
        .select('id, creator_id, title, description, location_name, weekday, start_time, max_members, member_count, status, created_at, updated_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      let membershipMap: Record<string, { role: RecurringGameMemberRole; status: RecurringGameMemberStatus }> = {};
      if (user && data && data.length > 0) {
        const gameIds = data.map((g: any) => g.id);
        const { data: memberships } = await supabase
          .from('recurring_game_members')
          .select('game_id, role, status')
          .eq('user_id', user.id)
          .in('game_id', gameIds);
        membershipMap = Object.fromEntries(
          (memberships || []).map((m: any) => [m.game_id, { role: m.role, status: m.status }])
        );
      }

      return (data || []).map((row: any) =>
        rowToGame(
          row,
          (membershipMap[row.id]?.role as RecurringGameMemberRole) ?? null,
          (membershipMap[row.id]?.status as RecurringGameMemberStatus) ?? null
        )
      );
    },
  });
}

// ─── 我参与的长期局 ──────────────────────────────────────────

export function useMyRecurringGames() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recurring-games', 'mine', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<RecurringGame[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('recurring_game_members')
        .select(`
          role, status,
          recurring_games(id, creator_id, title, description, location_name, weekday, start_time, max_members, member_count, status, created_at, updated_at)
        `)
        .eq('user_id', user.id)
        .in('status', ['active', 'on_leave'])
        .order('joined_at', { ascending: false });
      if (error) throw error;

      return (data || [])
        .filter((m: any) => m.recurring_games)
        .map((m: any) => rowToGame(m.recurring_games, m.role, m.status));
    },
  });
}

// ─── 长期局详情 ──────────────────────────────────────────────

export function useRecurringGameDetail(gameId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recurring-games', gameId],
    enabled: !!gameId,
    queryFn: async (): Promise<RecurringGame | null> => {
      if (!gameId) return null;
      const { data, error } = await supabase
        .from('recurring_games')
        .select('id, creator_id, title, description, location_name, weekday, start_time, max_members, member_count, status, created_at, updated_at')
        .eq('id', gameId)
        .single();
      if (error) throw error;
      if (!data) return null;

      let myRole: RecurringGameMemberRole | null = null;
      let myStatus: RecurringGameMemberStatus | null = null;
      if (user) {
        const { data: m } = await supabase
          .from('recurring_game_members')
          .select('role, status')
          .eq('game_id', gameId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (m) {
          myRole = m.role as RecurringGameMemberRole;
          myStatus = m.status as RecurringGameMemberStatus;
        }
      }

      return rowToGame(data, myRole, myStatus);
    },
  });
}

// ─── 长期局成员列表 ──────────────────────────────────────────

export function useRecurringGameMembers(gameId: string | undefined) {
  return useQuery({
    queryKey: ['recurring-games', gameId, 'members'],
    enabled: !!gameId,
    queryFn: async (): Promise<RecurringGameMember[]> => {
      if (!gameId) return [];
      const { data, error } = await supabase
        .from('recurring_game_members')
        .select(`
          id, game_id, user_id, role, status, joined_at,
          profiles(nickname, avatar_url, credit_score)
        `)
        .eq('game_id', gameId)
        .in('status', ['active', 'on_leave', 'pending'])
        .order('joined_at', { ascending: true });
      if (error) throw error;

      return (data || []).map((m: any): RecurringGameMember => ({
        id: m.id,
        gameId: m.game_id,
        userId: m.user_id,
        role: m.role as RecurringGameMemberRole,
        status: m.status as RecurringGameMemberStatus,
        joinedAt: m.joined_at,
        profile: {
          nickname: m.profiles?.nickname || '未知用户',
          avatarUrl: m.profiles?.avatar_url ?? null,
          creditScore: m.profiles?.credit_score ?? 100,
        },
      }));
    },
  });
}

// ─── 场次记录 ────────────────────────────────────────────────

export function useRecurringGameSessions(gameId: string | undefined) {
  return useQuery({
    queryKey: ['recurring-games', gameId, 'sessions'],
    enabled: !!gameId,
    queryFn: async (): Promise<RecurringGameSession[]> => {
      if (!gameId) return [];
      const { data, error } = await supabase
        .from('recurring_game_sessions')
        .select('id, game_id, session_date, status, notes, created_at')
        .eq('game_id', gameId)
        .order('session_date', { ascending: false })
        .limit(20);
      if (error) throw error;

      return (data || []).map((s: any): RecurringGameSession => ({
        id: s.id,
        gameId: s.game_id,
        sessionDate: s.session_date,
        status: s.status,
        notes: s.notes ?? null,
        createdAt: s.created_at,
      }));
    },
  });
}

// ─── 创建长期局 ──────────────────────────────────────────────

export function useCreateRecurringGame() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      locationName?: string;
      weekday: number;
      startTime: string;
      maxMembers: number;
    }) => {
      if (!user) throw new Error('请先登录');
      const { data: game, error: gameError } = await supabase
        .from('recurring_games')
        .insert({
          creator_id: user.id,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          location_name: input.locationName?.trim() || null,
          weekday: input.weekday,
          start_time: input.startTime,
          max_members: input.maxMembers,
        })
        .select('id')
        .single();
      if (gameError) throw gameError;

      // 创建者自动成为 organizer
      const { error: memberError } = await supabase.from('recurring_game_members').insert({
        game_id: game.id,
        user_id: user.id,
        role: 'organizer',
        status: 'active',
      });
      if (memberError) throw memberError;

      return game.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-games'] });
    },
  });
}

// ─── 加入长期局（申请）─────────────────────────────────────

export function useJoinRecurringGame() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId }: { gameId: string }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase.from('recurring_game_members').insert({
        game_id: gameId,
        user_id: user.id,
        role: 'member',
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: (_data, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-games', gameId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-games', 'mine', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['recurring-games', 'list', user?.id ?? 'anon'] });
    },
  });
}

// ─── 退出长期局 ──────────────────────────────────────────────

export function useLeaveRecurringGame() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gameId: string) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('recurring_game_members')
        .delete()
        .eq('game_id', gameId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: (_data, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-games', gameId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-games', 'mine', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['recurring-games', 'list', user?.id ?? 'anon'] });
    },
  });
}

// ─── 组织者审核申请 ──────────────────────────────────────────

export function useReviewRecurringGameMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      memberId,
      approve,
    }: {
      gameId: string;
      memberId: string;
      approve: boolean;
    }) => {
      if (approve) {
        const { error } = await supabase
          .from('recurring_game_members')
          .update({ status: 'active' })
          .eq('id', memberId)
          .eq('game_id', gameId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('recurring_game_members')
          .delete()
          .eq('id', memberId)
          .eq('game_id', gameId);
        if (error) throw error;
      }
    },
    onSuccess: (_data, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-games', gameId] });
    },
  });
}

// ─── 更新成员状态（请假/恢复）──────────────────────────────

export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      memberId,
      status,
    }: {
      gameId: string;
      memberId: string;
      status: RecurringGameMemberStatus;
    }) => {
      const { error } = await supabase
        .from('recurring_game_members')
        .update({ status })
        .eq('id', memberId)
        .eq('game_id', gameId);
      if (error) throw error;
    },
    onSuccess: (_data, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-games', gameId] });
    },
  });
}

// ─── 移除成员（组织者操作） ──────────────────────────────────

export function useRemoveRecurringGameMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, memberId }: { gameId: string; memberId: string }) => {
      const { error } = await supabase
        .from('recurring_game_members')
        .delete()
        .eq('id', memberId)
        .eq('game_id', gameId);
      if (error) throw error;
    },
    onSuccess: (_data, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-games', gameId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-games', gameId] });
    },
  });
}

// ─── 记录场次 ────────────────────────────────────────────────

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      sessionDate,
      notes,
    }: {
      gameId: string;
      sessionDate: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from('recurring_game_sessions').insert({
        game_id: gameId,
        session_date: sessionDate,
        notes: notes?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-games', gameId, 'sessions'] });
    },
  });
}

// ─── 更新场次状态 ────────────────────────────────────────────

export function useUpdateSessionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      sessionId,
      status,
    }: {
      gameId: string;
      sessionId: string;
      status: 'scheduled' | 'confirmed' | 'cancelled';
    }) => {
      const { error } = await supabase
        .from('recurring_game_sessions')
        .update({ status })
        .eq('id', sessionId);
      if (error) throw error;
      return gameId;
    },
    onSuccess: (_data, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-games', gameId, 'sessions'] });
    },
  });
}

// ─── 更新长期局状态（组织者）────────────────────────────────

export function useUpdateRecurringGameStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      status,
    }: {
      gameId: string;
      status: 'active' | 'paused' | 'ended';
    }) => {
      const { error } = await supabase
        .from('recurring_games')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', gameId);
      if (error) throw error;
    },
    onSuccess: (_data, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-games'] });
    },
  });
}
