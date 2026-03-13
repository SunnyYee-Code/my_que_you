import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import ReportDialog from '@/components/shared/ReportDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useMyGroups } from '@/hooks/useGroups';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

function GroupList({ groups, navigate }: { groups: any[]; navigate: (path: string) => void }) {
  const active = groups.filter(g => g.status === 'OPEN' || g.status === 'FULL' || g.status === 'IN_PROGRESS');
  const completed = groups.filter(g => g.status === 'COMPLETED');
  const cancelled = groups.filter(g => g.status === 'CANCELLED');
  const sections = [
    { title: '进行中', items: active },
    { title: '已完成', items: completed },
    { title: '已取消', items: cancelled },
  ].filter(s => s.items.length > 0);

  if (groups.length === 0) return <EmptyState title="暂无拼团" />;

  return (
    <div className="space-y-4">
      {sections.map(section => (
        <div key={section.title}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{section.title}</h3>
          <div className="space-y-2">
            {section.items.map(g => (
              <Card
                key={g.id}
                className={`cursor-pointer hover:shadow-sm transition-shadow ${section.title === '进行中' ? 'border-primary/30' : ''}`}
                onClick={() => navigate(`/group/${g.id}`)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium truncate max-w-[200px]">{g.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(g.start_time), 'MM-dd HH:mm')}
                    </div>
                  </div>
                  <StatusBadge status={g.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyGroupsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useMyGroups();

  // Fetch kicked/left exit records
  const { data: exitRecords = [] } = useQuery({
    queryKey: ['my-exits', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_member_exits')
        .select('*, group:groups(id, address, start_time, status, host_id, host:profiles!groups_host_id_fkey(id, nickname))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!user) { navigate('/login'); return null; }
  if (isLoading) return <AppLayout><LoadingState /></AppLayout>;

  const hosted = data?.hosted || [];
  const joined = data?.joined || [];
  const kickedRecords = exitRecords.filter(e => e.exit_type === 'kicked');

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">我的拼团</h1>
        </div>

        <Tabs defaultValue="hosted">
          <TabsList className="w-full">
            <TabsTrigger value="hosted" className="flex-1">我发起的 ({hosted.length})</TabsTrigger>
            <TabsTrigger value="joined" className="flex-1">我参加的 ({joined.length})</TabsTrigger>
            {kickedRecords.length > 0 && (
              <TabsTrigger value="kicked" className="flex-1">被移出 ({kickedRecords.length})</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="hosted" className="mt-3">
            <GroupList groups={hosted} navigate={navigate} />
          </TabsContent>
          <TabsContent value="joined" className="mt-3">
            <GroupList groups={joined} navigate={navigate} />
          </TabsContent>
          {kickedRecords.length > 0 && (
            <TabsContent value="kicked" className="mt-3">
              <div className="space-y-2">
                {kickedRecords.map(record => {
                  const group = record.group as any;
                  return (
                    <Card key={record.id} className="border-destructive/20">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium truncate max-w-[200px]">{group?.address || '未知'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {group?.start_time ? format(new Date(group.start_time), 'MM-dd HH:mm') : '-'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            被移出
                          </div>
                        </div>
                        {record.reason && (
                          <p className="text-xs bg-destructive/5 p-2 rounded text-muted-foreground">
                            房主理由：{record.reason}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            信用分变动：<span className="text-destructive font-medium">{record.credit_change}</span>
                          </span>
                          {group?.host_id && (
                            <ReportDialog reportedId={group.host_id} groupId={group.id} />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
