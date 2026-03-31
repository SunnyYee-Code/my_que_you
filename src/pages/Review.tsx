import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import AppLayout from '@/components/layout/AppLayout';
import UserAvatar from '@/components/shared/UserAvatar';
import LoadingState from '@/components/shared/LoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupDetail } from '@/hooks/useGroups';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REVIEW_TAG_OPTIONS, normalizeReviewTags } from '@/lib/review-insights';

type ReviewData = {
  targetId: string;
  punctuality: number;
  attitude: number;
  skill: number;
  comment: string;
  tags: string[];
};

function useCountdown(targetDate: Date) {
  const [remaining, setRemaining] = useState(() => Math.max(0, targetDate.getTime() - Date.now()));

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      const diff = Math.max(0, targetDate.getTime() - Date.now());
      setRemaining(diff);
      if (diff <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return { remaining, hours, minutes, seconds, expired: remaining <= 0 };
}

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: group, isLoading } = useGroupDetail(id);

  // Check if user already reviewed
  const { data: existingReviews = [] } = useQuery({
    queryKey: ['my-reviews', id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('group_id', id!)
        .eq('reviewer_id', user!.id);
      if (error) throw error;
      return data;
    },
  });

  const hasReviewed = existingReviews.length > 0;

  // Calculate 24h deadline from end_time
  const endTime = group ? new Date(group.end_time) : new Date();
  const deadline = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
  const countdown = useCountdown(deadline);

  const otherMembers = group?.members?.filter(m => m.user_id !== user?.id) || [];

  const [reviews, setReviews] = useState<ReviewData[]>([]);

  // Initialize reviews when members load
  useEffect(() => {
    if (otherMembers.length > 0 && reviews.length === 0) {
      setReviews(otherMembers.map(m => ({
        targetId: m.user_id,
        punctuality: 3,
        attitude: 3,
        skill: 3,
        comment: '',
        tags: [],
      })));
    }
  }, [otherMembers.length]);

  const updateReview = (targetId: string, field: keyof ReviewData, value: any) => {
    setReviews(prev => prev.map(r => r.targetId === targetId ? { ...r, [field]: value } : r));
  };

  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user || !id) return;
    if (countdown.expired) {
      toast({ title: '评价已过期', description: '超过24小时，无法评价', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const inserts = reviews.map(r => ({
        group_id: id,
        reviewer_id: user.id,
        target_id: r.targetId,
        punctuality: r.punctuality,
        attitude: r.attitude,
        skill: r.skill,
        comment: r.comment || null,
        tags: normalizeReviewTags(r.tags),
      }));
      const { error } = await supabase.from('reviews').insert(inserts);
      if (error) throw error;
      toast({ title: '评价已提交', description: '感谢您的反馈！' });
      navigate(-1);
    } catch (err: any) {
      toast({ title: '提交失败', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <AppLayout><LoadingState /></AppLayout>;
  if (!group) return <AppLayout><div className="text-center py-20">拼团不存在</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">评价牌友</h1>
        </div>

        {/* Countdown / status banner */}
        {hasReviewed ? (
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 p-3 rounded-lg">
            <Clock className="h-4 w-4 shrink-0" />
            <span>您已完成评价，感谢您的反馈！</span>
          </div>
        ) : countdown.expired ? (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>评价已过期，超过24小时无法评价</span>
          </div>
        ) : (
          <div className={cn(
            'flex items-center gap-2 text-sm p-3 rounded-lg',
            countdown.remaining < 3600000
              ? 'text-destructive bg-destructive/10'
              : 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10'
          )}>
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              评价倒计时：
              <strong className="font-mono">
                {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
              </strong>
              {countdown.remaining < 3600000 && ' · 即将过期！'}
            </span>
          </div>
        )}

        {hasReviewed || countdown.expired ? (
          <div className="text-center py-10">
            <Button variant="outline" onClick={() => navigate(-1)}>返回</Button>
          </div>
        ) : (
          <>
            {otherMembers.map(member => {
              if (!member.profiles) return null;
              const review = reviews.find(r => r.targetId === member.user_id);
              if (!review) return null;
              return (
                <Card key={member.user_id} className="animate-fade-in">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar nickname={member.profiles.nickname || ''} size="md" />
                      <span className="font-medium">{member.profiles.nickname}</span>
                    </div>

                    {[
                      { key: 'punctuality' as const, label: '准时' },
                      { key: 'attitude' as const, label: '态度' },
                      { key: 'skill' as const, label: '牌品' },
                    ].map(dim => (
                      <div key={dim.key} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{dim.label}</span>
                          <span className="font-semibold text-primary">{review[dim.key]}/5</span>
                        </div>
                        <Slider
                          value={[review[dim.key]]}
                          onValueChange={v => updateReview(member.user_id, dim.key, v[0])}
                          min={1}
                          max={5}
                          step={1}
                        />
                      </div>
                    ))}

                    <Textarea
                      placeholder="写点评价（选填）"
                      value={review.comment}
                      onChange={e => updateReview(member.user_id, 'comment', e.target.value)}
                      maxLength={200}
                    />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>标签评价</span>
                        <span className="text-xs text-muted-foreground">最多 3 个</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {REVIEW_TAG_OPTIONS.map(tag => {
                          const active = review.tags.includes(tag);

                          return (
                            <Button
                              key={tag}
                              type="button"
                              size="sm"
                              variant={active ? 'default' : 'outline'}
                              onClick={() => {
                                const nextTags = active
                                  ? review.tags.filter(item => item !== tag)
                                  : normalizeReviewTags([...review.tags, tag]);
                                updateReview(member.user_id, 'tags', nextTags);
                              }}
                            >
                              {tag}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Button className="w-full" onClick={submit} disabled={submitting}>
              {submitting ? '提交中...' : '提交评价'}
            </Button>
          </>
        )}
      </div>
    </AppLayout>
  );
}
