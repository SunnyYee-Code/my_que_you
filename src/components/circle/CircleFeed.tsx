import { useState, useRef, useCallback } from 'react';
import { PenSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import CirclePostCard from './CirclePostCard';
import CreatePostDialog from './CreatePostDialog';
import CommentSheet from './CommentSheet';
import { useCirclePosts } from '@/hooks/useCircle';
import { CIRCLE_TOPIC_TAGS, type CircleTopicTag } from '@/lib/circle';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function CircleFeed() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<CircleTopicTag | undefined>(undefined);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useCirclePosts(topicFilter);

  const posts = data?.pages.flat() ?? [];

  // 无限滚动：底部哨兵
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      });
      observerRef.current.observe(node);
      sentinelRef.current = node;
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  return (
    <div className="space-y-4">
      {/* 话题筛选栏 */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setTopicFilter(undefined)}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium border transition-all',
            !topicFilter
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:border-primary/40'
          )}
        >
          全部
        </button>
        {CIRCLE_TOPIC_TAGS.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => setTopicFilter(topicFilter === tag ? undefined : tag)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-all',
              topicFilter === tag
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/40'
            )}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* 登录用户的发帖入口 */}
      {user && (
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground gap-2 h-10"
          onClick={() => setCreateOpen(true)}
        >
          <PenSquare className="h-4 w-4" />
          分享一条动态…
        </Button>
      )}

      {/* 动态列表 */}
      {isLoading ? (
        <LoadingState />
      ) : posts.length === 0 ? (
        <EmptyState
          title="暂无动态"
          description={topicFilter ? `#${topicFilter} 话题下暂无动态` : '来发第一条动态吧'}
          actionLabel={user ? '发布动态' : undefined}
          onAction={user ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <CirclePostCard
              key={post.id}
              post={post}
              onCommentClick={id => setCommentPostId(id)}
            />
          ))}

          {/* 无限滚动哨兵 */}
          <div ref={sentinelCallback} className="h-4" />
          {isFetchingNextPage && <LoadingState />}
        </div>
      )}

      {/* 发帖弹窗 */}
      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* 评论面板 */}
      <CommentSheet
        postId={commentPostId}
        onClose={() => setCommentPostId(null)}
      />
    </div>
  );
}
