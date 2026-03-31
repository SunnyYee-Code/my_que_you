import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layout/AppLayout';
import UserAvatar from '@/components/shared/UserAvatar';
import CreditBadge from '@/components/shared/CreditBadge';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { useJoinRequests, useUpdateRequestStatus } from '@/hooks/useGroups';
import { useFulfillmentProfiles } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, X } from 'lucide-react';

export default function HostRequestsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: apps = [], isLoading } = useJoinRequests();
  const applicantIds = apps.map(app => app.user_id);
  const { data: fulfillmentProfiles = {} } = useFulfillmentProfiles(applicantIds);
  const updateStatus = useUpdateRequestStatus();

  if (!user) { navigate('/login'); return null; }
  if (isLoading) return <AppLayout><LoadingState /></AppLayout>;

  const pendingApps = apps.filter(a => a.status === 'PENDING');

  const handleAction = async (appId: string, action: 'APPROVED' | 'REJECTED', groupId: string, userId: string) => {
    try {
      await updateStatus.mutateAsync({ requestId: appId, status: action, groupId, userId });
      toast({ title: action === 'APPROVED' ? '已同意申请' : '已拒绝申请' });
    } catch (err: any) {
      toast({ title: '操作失败', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">审核管理</h1>
          {pendingApps.length > 0 && (
            <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
              {pendingApps.length}条待审核
            </span>
          )}
        </div>

        {apps.length === 0 ? (
          <EmptyState title="暂无申请" description="还没有人申请加入您的拼团" />
        ) : (
          <div className="space-y-3">
            {apps.map(app => {
              const appUser = app.user;
              const group = app.group;
              if (!appUser || !group) return null;
              return (
                <Card key={app.id} className="animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3" onClick={() => navigate(`/profile/${appUser.id}`)} role="button">
                        <UserAvatar nickname={appUser.nickname || ''} size="md" />
                        <div>
                          <p className="font-medium text-sm">{appUser.nickname}</p>
                          <CreditBadge score={appUser.credit_score} />
                        </div>
                      </div>
                      {app.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAction(app.id, 'APPROVED', app.group_id, app.user_id)} className="gap-1" disabled={updateStatus.isPending}>
                            <Check className="h-3.5 w-3.5" /> 同意
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleAction(app.id, 'REJECTED', app.group_id, app.user_id)} className="gap-1" disabled={updateStatus.isPending}>
                            <X className="h-3.5 w-3.5" /> 拒绝
                          </Button>
                        </div>
                      ) : (
                        <span className={`text-xs font-medium ${app.status === 'APPROVED' ? 'text-success' : 'text-destructive'}`}>
                          {app.status === 'APPROVED' ? '已同意' : '已拒绝'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">申请加入：{group.address}</p>
                    {fulfillmentProfiles[app.user_id] && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {fulfillmentProfiles[app.user_id].fulfillmentRate === null
                            ? '履约记录不足'
                            : `履约率 ${fulfillmentProfiles[app.user_id].fulfillmentRate}% · 已完成 ${fulfillmentProfiles[app.user_id].completedCount} 场`}
                        </p>
                        {fulfillmentProfiles[app.user_id].topPositiveTags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {fulfillmentProfiles[app.user_id].topPositiveTags.map(tag => (
                              <span key={tag} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {fulfillmentProfiles[app.user_id].topRiskTags.length > 0 && (
                          <p className="text-xs text-[hsl(var(--warning))]">
                            待关注：{fulfillmentProfiles[app.user_id].topRiskTags.join('、')}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
