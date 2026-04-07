/**
 * T15 4.3.3 雀友圈 — Supabase 数据 Hooks
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CirclePost, CircleComment, CircleTopicTag } from '@/lib/circle';

export type { CirclePost, CircleComment };

const PAGE_SIZE = 20;

// ─── 信息流（分页） ──────────────────────────────────────────

/**
 * 获取雀友圈动态列表（无限加载，可按话题筛选）
 */
export function useCirclePosts(topicTag?: CircleTopicTag) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['circle-posts', topicTag ?? 'all'],
    initialPageParam: 0 as number,
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      let query = supabase
        .from('circle_posts')
        .select(
          'id, user_id, content, topic_tag, like_count, comment_count, is_hidden, created_at, profiles(nickname, avatar_url, credit_score)'
        )
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (topicTag) {
        query = query.eq('topic_tag', topicTag);
      }

      const { data, error } = await query;
      if (error) throw error;

      const posts = data || [];

      // 批量查询当前用户的点赞状态
      let likedPostIds = new Set<string>();
      if (user && posts.length > 0) {
        const postIds = posts.map((p: any) => p.id);
        const { data: likes } = await supabase
          .from('circle_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        likedPostIds = new Set((likes || []).map((l: any) => l.post_id));
      }

      return posts.map((p: any): CirclePost => ({
        id: p.id,
        userId: p.user_id,
        content: p.content,
        topicTag: p.topic_tag ?? null,
        likeCount: p.like_count,
        commentCount: p.comment_count,
        isHidden: p.is_hidden,
        createdAt: p.created_at,
        author: {
          nickname: p.profiles?.nickname || '未知用户',
          avatarUrl: p.profiles?.avatar_url ?? null,
          creditScore: p.profiles?.credit_score ?? 100,
        },
        isLikedByMe: likedPostIds.has(p.id),
      }));
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
  });
}

// ─── 发布动态 ────────────────────────────────────────────────

export function useCreateCirclePost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      content,
      topicTag,
    }: {
      content: string;
      topicTag?: CircleTopicTag | null;
    }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('circle_posts')
        .insert({ user_id: user.id, content, topic_tag: topicTag ?? null } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
    },
  });
}

// ─── 删除动态 ────────────────────────────────────────────────

export function useDeleteCirclePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('circle_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
    },
  });
}

// ─── 点赞 / 取消点赞 ─────────────────────────────────────────

export function useToggleCircleLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user) throw new Error('请先登录');
      if (isLiked) {
        const { error } = await supabase
          .from('circle_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('circle_likes')
          .insert({ post_id: postId, user_id: user.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
    },
  });
}

// ─── 评论列表 ────────────────────────────────────────────────

export function useCircleComments(postId: string | undefined) {
  return useQuery({
    queryKey: ['circle-comments', postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('circle_comments')
        .select(
          'id, post_id, user_id, content, created_at, profiles(nickname, avatar_url)'
        )
        .eq('post_id', postId!)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map((c: any): CircleComment => ({
        id: c.id,
        postId: c.post_id,
        userId: c.user_id,
        content: c.content,
        createdAt: c.created_at,
        author: {
          nickname: c.profiles?.nickname || '未知用户',
          avatarUrl: c.profiles?.avatar_url ?? null,
        },
      }));
    },
  });
}

// ─── 发布评论 ────────────────────────────────────────────────

export function useAddCircleComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('circle_comments')
        .insert({ post_id: postId, user_id: user.id, content } as any);
      if (error) throw error;
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['circle-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
    },
  });
}

// ─── 删除评论 ────────────────────────────────────────────────

export function useDeleteCircleComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      const { error } = await supabase.from('circle_comments').delete().eq('id', commentId);
      if (error) throw error;
      return postId;
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['circle-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
    },
  });
}

// ─── 举报内容 ────────────────────────────────────────────────

export function useReportCircleContent() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      targetType,
      targetId,
      reason,
    }: {
      targetType: 'post' | 'comment';
      targetId: string;
      reason: string;
    }) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('circle_reports')
        .insert({ target_type: targetType, target_id: targetId, reporter_id: user.id, reason } as any);
      if (error) throw error;
    },
  });
}

// ─── 管理员：隐藏 / 恢复动态 ─────────────────────────────────

export function useHideCirclePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, hide }: { postId: string; hide: boolean }) => {
      const { error } = await supabase
        .from('circle_posts')
        .update({ is_hidden: hide } as any)
        .eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
    },
  });
}
