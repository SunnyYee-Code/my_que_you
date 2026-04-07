import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2 } from 'lucide-react';
import UserAvatar from '@/components/shared/UserAvatar';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { useCircleComments, useAddCircleComment, useDeleteCircleComment } from '@/hooks/useCircle';
import { validateCommentContent, COMMENT_CONTENT_MAX, getCharCountClass } from '@/lib/circle';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CommentSheetProps {
  postId: string | null;
  onClose: () => void;
}

export default function CommentSheet({ postId, onClose }: CommentSheetProps) {
  const [commentText, setCommentText] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: comments = [], isLoading } = useCircleComments(postId ?? undefined);
  const addComment = useAddCircleComment();
  const deleteComment = useDeleteCircleComment();

  const handleSubmit = async () => {
    if (!postId) return;
    const validation = validateCommentContent(commentText);
    if (!validation.valid) {
      toast({ title: '评论有误', description: validation.error, variant: 'destructive' });
      return;
    }
    try {
      await addComment.mutateAsync({ postId, content: commentText.trim() });
      setCommentText('');
    } catch (err: any) {
      toast({ title: '评论失败', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!postId) return;
    try {
      await deleteComment.mutateAsync({ commentId, postId });
    } catch (err: any) {
      toast({ title: '删除失败', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={!!postId} onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" className="h-[70vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>评论 ({comments.length})</SheetTitle>
        </SheetHeader>

        {/* 评论列表 */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {isLoading ? (
            <LoadingState />
          ) : comments.length === 0 ? (
            <EmptyState title="暂无评论" description="成为第一个评论的人吧" />
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <UserAvatar
                  nickname={comment.author.nickname}
                  avatar={comment.author.avatarUrl ?? undefined}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{comment.author.nickname}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5 break-words">{comment.content}</p>
                </div>
                {user?.id === comment.userId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(comment.id)}
                    disabled={deleteComment.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* 输入区 */}
        {user && (
          <div className="border-t pt-3 flex gap-2 items-end">
            <div className="flex-1 relative">
              <Input
                placeholder="说点什么…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                maxLength={COMMENT_CONTENT_MAX + 20}
                className="pr-14"
              />
              <span
                className={cn(
                  'absolute right-2 bottom-2 text-xs tabular-nums pointer-events-none',
                  getCharCountClass(commentText.length, COMMENT_CONTENT_MAX)
                )}
              >
                {commentText.length}/{COMMENT_CONTENT_MAX}
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={
                addComment.isPending ||
                commentText.length === 0 ||
                commentText.length > COMMENT_CONTENT_MAX
              }
            >
              {addComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '发送'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
