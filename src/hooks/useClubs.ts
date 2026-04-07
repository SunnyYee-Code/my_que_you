/**
 * T15 4.3.4 俱乐部 — Supabase 数据 Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Club,
  ClubMember,
  ClubAnnouncement,
  ClubMemberRole,
} from '@/lib/clubs';

// ─── 俱乐部列表（公开 + 我加入的） ──────────────────────────

export function useClubs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['clubs', 'list', user?.id ?? 'anon'],
    queryFn: async (): Promise<Club[]> => {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, description, avatar_url, is_public, creator_id, member_count, created_at, updated_at')
        .order('member_count', { ascending: false })
        .limit(50);
      if (error) throw error;

      // 批量查询当前用户在这些俱乐部中的角色
      let membershipMap: Record<string, { role: ClubMemberRole; status: string }> = {};
      if (user && data && data.length > 0) {
        const clubIds = data.map((c: any) => c.id);
        const { data: memberships } = await supabase
          .from('club_members')
          .select('club_id, role, status')
          .eq('user_id', user.id)
          .in('club_id', clubIds);
        membershipMap = Object.fromEntries(
          (memberships || []).map((m: any) => [m.club_id, { role: m.role, status: m.status }])
        );
      }

      return (data || []).map((c: any): Club => ({
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        avatarUrl: c.avatar_url ?? null,
        isPublic: c.is_public,
        creatorId: c.creator_id,
        memberCount: c.member_count,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        myRole: (membershipMap[c.id]?.role as ClubMemberRole) ?? null,
        myStatus: (membershipMap[c.id]?.status as any) ?? null,
      }));
    },
  });
}

// ─── 我加入的俱乐部 ──────────────────────────────────────────

export function useMyClubs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['clubs', 'mine', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Club[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('club_members')
        .select(`
          role, status,
          clubs(id, name, description, avatar_url, is_public, creator_id, member_count, created_at, updated_at)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: false });
      if (error) throw error;

      return (data || []).map((m: any): Club => ({
        id: m.clubs.id,
        name: m.clubs.name,
        description: m.clubs.description ?? null,
        avatarUrl: m.clubs.avatar_url ?? null,
        isPublic: m.clubs.is_public,
        creatorId: m.clubs.creator_id,
        memberCount: m.clubs.member_count,
        createdAt: m.clubs.created_at,
        updatedAt: m.clubs.updated_at,
        myRole: m.role as ClubMemberRole,
        myStatus: m.status,
      }));
    },
  });
}

// ─── 俱乐部详情 ──────────────────────────────────────────────

export function useClubDetail(clubId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['clubs', clubId],
    enabled: !!clubId,
    queryFn: async (): Promise<Club | null> => {
      if (!clubId) return null;
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, description, avatar_url, is_public, creator_id, member_count, created_at, updated_at')
        .eq('id', clubId)
        .single();
      if (error) throw error;
      if (!data) return null;

      let myRole: ClubMemberRole | null = null;
      let myStatus = null;
      if (user) {
        const { data: m } = await supabase
          .from('club_members')
          .select('role, status')
          .eq('club_id', clubId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (m) {
          myRole = m.role as ClubMemberRole;
          myStatus = m.status;
        }
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description ?? null,
        avatarUrl: data.avatar_url ?? null,
        isPublic: data.is_public,
        creatorId: data.creator_id,
        memberCount: data.member_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        myRole,
        myStatus,
      };
    },
  });
}

// ─── 俱乐部成员列表 ──────────────────────────────────────────

export function useClubMembers(clubId: string | undefined) {
  return useQuery({
    queryKey: ['clubs', clubId, 'members'],
    enabled: !!clubId,
    queryFn: async (): Promise<ClubMember[]> => {
      if (!clubId) return [];
      const { data, error } = await supabase
        .from('club_members')
        .select(`
          id, club_id, user_id, role, status, joined_at,
          profiles(nickname, avatar_url, credit_score)
        `)
        .eq('club_id', clubId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });
      if (error) throw error;

      return (data || []).map((m: any): ClubMember => ({
        id: m.id,
        clubId: m.club_id,
        userId: m.user_id,
        role: m.role as ClubMemberRole,
        status: m.status,
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

// ─── 待审核成员（管理员视角） ────────────────────────────────

export function useClubPendingMembers(clubId: string | undefined) {
  return useQuery({
    queryKey: ['clubs', clubId, 'pending'],
    enabled: !!clubId,
    queryFn: async (): Promise<ClubMember[]> => {
      if (!clubId) return [];
      const { data, error } = await supabase
        .from('club_members')
        .select(`
          id, club_id, user_id, role, status, joined_at,
          profiles(nickname, avatar_url, credit_score)
        `)
        .eq('club_id', clubId)
        .eq('status', 'pending')
        .order('joined_at', { ascending: true });
      if (error) throw error;

      return (data || []).map((m: any): ClubMember => ({
        id: m.id,
        clubId: m.club_id,
        userId: m.user_id,
        role: m.role as ClubMemberRole,
        status: m.status,
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

// ─── 俱乐部公告 ──────────────────────────────────────────────

export function useClubAnnouncements(clubId: string | undefined) {
  return useQuery({
    queryKey: ['clubs', clubId, 'announcements'],
    enabled: !!clubId,
    queryFn: async (): Promise<ClubAnnouncement[]> => {
      if (!clubId) return [];
      const { data, error } = await supabase
        .from('club_announcements')
        .select(`
          id, club_id, author_id, content, is_pinned, created_at,
          profiles(nickname, avatar_url)
        `)
        .eq('club_id', clubId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;

      return (data || []).map((a: any): ClubAnnouncement => ({
        id: a.id,
        clubId: a.club_id,
        authorId: a.author_id,
        content: a.content,
        isPinned: a.is_pinned,
        createdAt: a.created_at,
        author: {
          nickname: a.profiles?.nickname || '未知用户',
          avatarUrl: a.profiles?.avatar_url ?? null,
        },
      }));
    },
  });
}

// ─── 创建俱乐部 ──────────────────────────────────────────────

export function useCreateClub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string; isPublic: boolean }) => {
      if (!user) throw new Error('请先登录');
      // 创建俱乐部
      const { data: club, error: clubError } = await supabase
        .from('clubs')
        .insert({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          is_public: input.isPublic,
          creator_id: user.id,
        })
        .select('id')
        .single();
      if (clubError) throw clubError;

      // 创建者自动成为 owner
      const { error: memberError } = await supabase.from('club_members').insert({
        club_id: club.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });
      if (memberError) throw memberError;

      return club.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}

// ─── 申请加入 / 直接加入（公开俱乐部） ──────────────────────

export function useJoinClub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clubId, isPublic }: { clubId: string; isPublic: boolean }) => {
      if (!user) throw new Error('请先登录');
      const status = isPublic ? 'active' : 'pending';
      const { error } = await supabase.from('club_members').insert({
        club_id: clubId,
        user_id: user.id,
        role: 'member',
        status,
      });
      if (error) throw error;
      return status;
    },
    onSuccess: (_status, { clubId }) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId] });
      queryClient.invalidateQueries({ queryKey: ['clubs', 'mine', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['clubs', 'list', user?.id ?? 'anon'] });
    },
  });
}

// ─── 退出俱乐部 ──────────────────────────────────────────────

export function useLeaveClub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clubId: string) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: (_data, clubId) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId] });
      queryClient.invalidateQueries({ queryKey: ['clubs', 'mine', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['clubs', 'list', user?.id ?? 'anon'] });
    },
  });
}

// ─── 审核申请（管理员操作） ──────────────────────────────────

export function useReviewClubMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clubId,
      memberId,
      approve,
    }: {
      clubId: string;
      memberId: string;
      approve: boolean;
    }) => {
      if (approve) {
        const { error } = await supabase
          .from('club_members')
          .update({ status: 'active' })
          .eq('id', memberId)
          .eq('club_id', clubId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('club_members')
          .delete()
          .eq('id', memberId)
          .eq('club_id', clubId);
        if (error) throw error;
      }
    },
    onSuccess: (_data, { clubId }) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId] });
    },
  });
}

// ─── 移除成员（管理员操作） ──────────────────────────────────

export function useRemoveClubMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clubId, userId }: { clubId: string; userId: string }) => {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_data, { clubId }) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId] });
    },
  });
}

// ─── 发布公告 ────────────────────────────────────────────────

export function useCreateAnnouncement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clubId,
      content,
      isPinned = false,
    }: {
      clubId: string;
      content: string;
      isPinned?: boolean;
    }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase.from('club_announcements').insert({
        club_id: clubId,
        author_id: user.id,
        content: content.trim(),
        is_pinned: isPinned,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { clubId }) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'announcements'] });
    },
  });
}

// ─── 删除公告 ────────────────────────────────────────────────

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clubId, announcementId }: { clubId: string; announcementId: string }) => {
      const { error } = await supabase
        .from('club_announcements')
        .delete()
        .eq('id', announcementId);
      if (error) throw error;
      return clubId;
    },
    onSuccess: (_data, { clubId }) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'announcements'] });
    },
  });
}
