import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/components/layout/AppLayout';
import UserAvatar from '@/components/shared/UserAvatar';
import CreditBadge from '@/components/shared/CreditBadge';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingState from '@/components/shared/LoadingState';
import ReportDialog from '@/components/shared/ReportDialog';
import { useProfileById, useReviewsByTarget, useGroupsByMember, useCreditHistory } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Edit, Star, Flag, TrendingUp, TrendingDown, History, ShieldCheck, ShieldAlert, AlertTriangle, Award, CheckCircle, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAddToBlacklist, useBlacklistStatus, useRemoveFromBlacklist } from '@/hooks/useBlacklist';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const isSelf = id === user?.id;
  const { data: profile, isLoading: profileLoading } = useProfileById(id);
  const { data: reviews = [] } = useReviewsByTarget(id);
  const { data: groups = [] } = useGroupsByMember(id);
  const { data: creditHistory = [] } = useCreditHistory(isSelf ? id : undefined);
  const { data: blacklistState } = useBlacklistStatus(id);
  const addToBlacklist = useAddToBlacklist();
  const removeFromBlacklist = useRemoveFromBlacklist();

  if (profileLoading) return <AppLayout><LoadingState /></AppLayout>;
  if (!profile) return <AppLayout><div className="text-center py-20">用户不存在</div></AppLayout>;

  const avgPunctuality = reviews.length ? (reviews.reduce((s, r) => s + r.punctuality, 0) / reviews.length).toFixed(1) : '-';
  const avgAttitude = reviews.length ? (reviews.reduce((s, r) => s + r.attitude, 0) / reviews.length).toFixed(1) : '-';
  const avgSkill = reviews.length ? (reviews.reduce((s, r) => s + r.skill, 0) / reviews.length).toFixed(1) : '-';

  const handleAddToBlacklist = async () => {
    if (!id) return;
    try {
      await addToBlacklist.mutateAsync({ blockedUserId: id });
      toast({
        title: '已加入黑名单',
        description: '你们之间的私聊和好友互动已被屏蔽。',
      });
    } catch (error: any) {
      toast({
        title: '拉黑失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveFromBlacklist = async () => {
    if (!(blacklistState as any)?.entryId) return;
    try {
      await removeFromBlacklist.mutateAsync((blacklistState as any).entryId);
      toast({
        title: '已移除黑名单',
        description: '该用户已恢复正常互动权限。',
      });
    } catch (error: any) {
      toast({
        title: '移除失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <Card className="shadow-mahjong">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <UserAvatar nickname={profile.nickname || ''} avatar={profile.avatar_url || ''} size="lg" />
              <div className="flex-1 space-y-2">
                 <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold">{profile.nickname}</h1>
                    <CreditBadge score={profile.credit_score} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>UID: {(profile as any).uid}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => {
                        navigator.clipboard.writeText((profile as any).uid || '');
                        toast({ title: '已复制UID' });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                <p className="text-sm text-muted-foreground">注册于 {format(new Date(profile.created_at), 'yyyy-MM-dd')}</p>
                {isSelf ? (
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => navigate('/profile/edit')} className="gap-1">
                      <Edit className="h-3.5 w-3.5" /> 编辑资料
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/settings')} className="gap-1">
                      <Settings className="h-3.5 w-3.5" /> 设置
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="outline" onClick={() => navigate('/admin')} className="gap-1 text-primary">
                        <ShieldCheck className="h-3.5 w-3.5" /> 管理后台
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="pt-1 space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      {blacklistState?.relationship === 'blocked_by_me' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive"
                          onClick={handleRemoveFromBlacklist}
                          disabled={removeFromBlacklist.isPending}
                        >
                          取消拉黑
                        </Button>
                      ) : blacklistState?.relationship === 'blocked_by_them' ? (
                        <Button size="sm" variant="outline" className="gap-1" disabled>
                          对方已屏蔽你
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive"
                          onClick={handleAddToBlacklist}
                          disabled={addToBlacklist.isPending}
                        >
                          拉黑用户
                        </Button>
                      )}
                      <ReportDialog
                        reportedId={id!}
                        trigger={
                          <Button size="sm" variant="outline" className="gap-1 text-muted-foreground hover:text-destructive">
                            <Flag className="h-3.5 w-3.5" /> 举报用户
                          </Button>
                        }
                      />
                    </div>
                    {blacklistState?.isBlocked && blacklistState.reason && (
                      <p className="text-xs text-muted-foreground">{blacklistState.reason}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Star className="h-4 w-4 text-[hsl(var(--gold))]" /> 评价摘要</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[{ label: '准时', val: avgPunctuality }, { label: '态度', val: avgAttitude }, { label: '牌品', val: avgSkill }].map(d => (
                <div key={d.label} className="space-y-1">
                  <div className="text-2xl font-bold text-primary">{d.val}</div>
                  <div className="text-xs text-muted-foreground">{d.label}</div>
                </div>
              ))}
            </div>
            {reviews.length > 0 && (
              <div className="mt-4 space-y-2">
                {reviews.slice(0, 3).map(r => (
                  <p key={r.id} className="text-sm text-muted-foreground">"{r.comment}"</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit History - only visible to self */}
        {isSelf && (
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> 信用记录
              </h2>
              {creditHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">暂无信用记录</p>
              ) : (
                <div className="space-y-3">
                  {creditHistory.map(record => {
                    const isPositive = record.change > 0;
                    const iconMap: Record<string, React.ReactNode> = {
                      '守信奖励': <ShieldCheck className="h-4 w-4 text-[hsl(var(--success))]" />,
                      '完成拼团': <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />,
                      '任务奖励': <Award className="h-4 w-4 text-[hsl(var(--gold))]" />,
                      '被举报扣除': <ShieldAlert className="h-4 w-4 text-destructive" />,
                      '失信扣除': <AlertTriangle className="h-4 w-4 text-destructive" />,
                      '迟到扣除': <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />,
                      '缺席扣除': <ShieldAlert className="h-4 w-4 text-destructive" />,
                    };
                    const icon = iconMap[record.reason] || (isPositive
                      ? <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />
                      : <TrendingDown className="h-4 w-4 text-destructive" />);

                    return (
                      <div key={record.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                        <div className={cn(
                          'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
                          isPositive ? 'bg-[hsl(var(--success))]/10' : 'bg-destructive/10'
                        )}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{record.reason}</span>
                            <span className={cn(
                              'text-sm font-bold shrink-0',
                              isPositive ? 'text-[hsl(var(--success))]' : 'text-destructive'
                            )}>
                              {isPositive ? '+' : ''}{record.change}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}
                            </span>
                            {record.can_appeal && !record.appeal_status && (
                              <span className="text-xs text-primary cursor-pointer hover:underline">申诉</span>
                            )}
                            {record.appeal_status === 'pending' && (
                              <span className="text-xs text-[hsl(var(--warning))]">申诉中</span>
                            )}
                            {record.appeal_status === 'approved' && (
                              <span className="text-xs text-[hsl(var(--success))]">申诉通过</span>
                            )}
                            {record.appeal_status === 'rejected' && (
                              <span className="text-xs text-destructive">申诉驳回</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="all">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">全部拼团</TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">已完成</TabsTrigger>
            <TabsTrigger value="cancelled" className="flex-1">已取消</TabsTrigger>
          </TabsList>
          {['all', 'completed', 'cancelled'].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-3 mt-3">
              {groups
                .filter(g => tab === 'all' || (tab === 'completed' && g.status === 'COMPLETED') || (tab === 'cancelled' && g.status === 'CANCELLED'))
                .map(g => (
                  <Card key={g.id} className="cursor-pointer hover:shadow-sm" onClick={() => navigate(`/group/${g.id}`)}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{g.address}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(g.start_time), 'yyyy-MM-dd HH:mm')}</p>
                      </div>
                      <StatusBadge status={g.status} />
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
