import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/components/layout/AppLayout';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, useMarkNotificationRead } from '@/hooks/useNotifications';
import { ArrowLeft, Bell, AlertTriangle, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const iconMap = {
  application_update: Users,
  group_cancelled: AlertTriangle,
  credit_change: Star,
  review_received: Star,
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (!user) { navigate('/login'); return null; }
  if (isLoading) return <AppLayout><LoadingState /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">消息中心</h1>
        </div>

        {notifications.length === 0 ? (
          <EmptyState title="暂无消息" icon={<Bell className="h-8 w-8 text-muted-foreground" />} />
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const Icon = iconMap[n.type as keyof typeof iconMap] || Bell;
              return (
                <Card
                  key={n.id}
                  className={cn('cursor-pointer transition-colors', !n.read && 'border-primary/30 bg-primary/5')}
                  onClick={() => {
                    markRead.mutate(n.id);
                    if (n.link_to) navigate(n.link_to);
                  }}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={cn('h-9 w-9 rounded-full flex items-center justify-center shrink-0', !n.read ? 'bg-primary/15' : 'bg-muted')}>
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { locale: zhCN, addSuffix: true })}
                      </p>
                    </div>
                    {!n.read && <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />}
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
