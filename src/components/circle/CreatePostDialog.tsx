import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCreateCirclePost } from '@/hooks/useCircle';
import {
  CIRCLE_TOPIC_TAGS,
  CIRCLE_TOPIC_TAG_COLORS,
  POST_CONTENT_MAX,
  validatePostContent,
  getCharCountClass,
  type CircleTopicTag,
} from '@/lib/circle';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreatePostDialog({ open, onOpenChange }: CreatePostDialogProps) {
  const [content, setContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<CircleTopicTag | null>(null);
  const { toast } = useToast();
  const createPost = useCreateCirclePost();

  const handleSubmit = async () => {
    const validation = validatePostContent(content);
    if (!validation.valid) {
      toast({ title: '内容有误', description: validation.error, variant: 'destructive' });
      return;
    }
    try {
      await createPost.mutateAsync({ content: content.trim(), topicTag: selectedTag });
      toast({ title: '发布成功' });
      setContent('');
      setSelectedTag(null);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: '发布失败', description: err.message, variant: 'destructive' });
    }
  };

  const charCount = content.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>发布动态</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 话题标签选择 */}
          <div className="flex flex-wrap gap-2">
            {CIRCLE_TOPIC_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                  selectedTag === tag
                    ? CIRCLE_TOPIC_TAG_COLORS[tag]
                    : 'border-border text-muted-foreground hover:border-primary/40'
                )}
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* 内容输入 */}
          <div className="relative">
            <Textarea
              placeholder="分享你的局后故事、约局需求或心得体会…"
              value={content}
              onChange={e => setContent(e.target.value)}
              className="min-h-[120px] resize-none pr-2"
              maxLength={POST_CONTENT_MAX + 50}
            />
            <span
              className={cn(
                'absolute bottom-2 right-3 text-xs tabular-nums',
                getCharCountClass(charCount, POST_CONTENT_MAX)
              )}
            >
              {charCount}/{POST_CONTENT_MAX}
            </span>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={createPost.isPending}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createPost.isPending || charCount === 0 || charCount > POST_CONTENT_MAX}
            >
              {createPost.isPending ? '发布中…' : '发布'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
