import { useState } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Flag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import UserAvatar from '@/components/shared/UserAvatar';
import CreditBadge from '@/components/shared/CreditBadge';
import { useToggleCircleLike, useDeleteCirclePost, useReportCircleContent } from '@/hooks/useCircle';
import { CIRCLE_TOPIC_TAG_COLORS, CIRCLE_REPORT_REASONS, type CirclePost } from '@/lib/circle';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CirclePostCardProps {
  post: CirclePost;
  onCommentClick: (postId: string) => void;
}

export default function CirclePostCard({ post, onCommentClick }: CirclePostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const toggleLike = useToggleCircleLike();
  const deletePost = useDeleteCirclePost();
  const reportContent = useReportCircleContent();

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');

  const isOwner = user?.id === post.userId;

  const handleLike = () => {
    if (!user) {
      toast({ title: '请先登录', variant: 'destructive' });
      return;
    }
    toggleLike.mutate({ postId: post.id, isLiked: post.isLikedByMe });
  };

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(post.id);
      toast({ title: '已删除' });
    } catch (err: any) {
      toast({ title: '删除失败', description: err.message, variant: 'destructive' });
    }
  };

  const handleReport = async () => {
    if (!reportReason) {
      toast({ title: '请选择举报原因', variant: 'destructive' });
      return;
    }
    try {
      await reportContent.mutateAsync({ targetType: 'post', targetId: post.id, reason: reportReason });
      toast({ title: '举报已提交，感谢反馈' });
      setReportOpen(false);
      setReportReason('');
    } catch (err: any) {
      // 重复举报
      if (err.message?.includes('unique') || err.code === '23505') {
        toast({ title: '你已举报过这条动态' });
      } else {
        toast({ title: '举报失败', description: err.message, variant: 'destructive' });
      }
      setReportOpen(false);
    }
  };

  return (
    <>
      <Card className="animate-fade-in">
        <CardContent className="p-4 space-y-3">
          {/* 作者信息 */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                nickname={post.author.nickname}
                avatar={post.author.avatarUrl ?? undefined}
                size="md"
              />
              <div className="min-w-0">
                <span className="text-sm font-semibold truncate block">{post.author.nickname}</span>
                <div className="flex items-center gap-1.5">
                  <CreditBadge score={post.author.creditScore} />
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.createdAt), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {post.topicTag && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium border',
                    CIRCLE_TOPIC_TAG_COLORS[post.topicTag]
                  )}
                >
                  #{post.topicTag}
                </span>
              )}

              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwner ? (
                      <DropdownMenuItem
                        className="text-destructive gap-2"
                        onClick={handleDelete}
                        disabled={deletePost.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> 删除
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="gap-2"
                        onClick={() => setReportOpen(true)}
                      >
                        <Flag className="h-3.5 w-3.5" /> 举报
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* 正文 */}
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{post.content}</p>

          {/* 互动按钮 */}
          <div className="flex items-center gap-4 pt-1 border-t border-border/40">
            <button
              type="button"
              onClick={handleLike}
              disabled={toggleLike.isPending}
              className={cn(
                'flex items-center gap-1.5 text-sm transition-colors',
                post.isLikedByMe ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-400'
              )}
            >
              <Heart
                className={cn('h-4 w-4', post.isLikedByMe && 'fill-current')}
              />
              <span className="tabular-nums">{post.likeCount > 0 ? post.likeCount : ''}</span>
              <span>{post.isLikedByMe ? '已赞' : '点赞'}</span>
            </button>

            <button
              type="button"
              onClick={() => onCommentClick(post.id)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="tabular-nums">{post.commentCount > 0 ? post.commentCount : ''}</span>
              <span>评论</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 举报 Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>举报原因</DialogTitle>
          </DialogHeader>
          <RadioGroup value={reportReason} onValueChange={setReportReason} className="space-y-2">
            {CIRCLE_REPORT_REASONS.map(reason => (
              <div key={reason} className="flex items-center gap-2">
                <RadioGroupItem value={reason} id={`report-${reason}`} />
                <Label htmlFor={`report-${reason}`} className="cursor-pointer text-sm">
                  {reason}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setReportOpen(false)}>取消</Button>
            <Button
              onClick={handleReport}
              disabled={reportContent.isPending || !reportReason}
              variant="destructive"
              size="sm"
            >
              提交举报
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
