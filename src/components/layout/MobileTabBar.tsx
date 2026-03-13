import { Link, useLocation } from 'react-router-dom';
import { Home, Plus, Bell, User, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadCount } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

export default function MobileTabBar() {
  const location = useLocation();
  const { user } = useAuth();
  const unreadCount = useUnreadCount();

  const tabs = [
    { to: '/community', icon: Home, label: '社区' },
    { to: '/friends', icon: Users, label: '好友' },
    { to: '/group/create', icon: Plus, label: '创建' },
    { to: '/notifications', icon: Bell, label: '消息' },
    { to: user ? `/profile/${user.id}` : '/login', icon: User, label: '我的' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map(tab => {
          const isActive = tab.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.to);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.label}
              to={tab.to}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors relative',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {tab.to === '/group/create' ? (
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center -mt-4 shadow-mahjong">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
              ) : (
                <Icon className="h-5 w-5" />
              )}
              <span className="text-xs font-medium">{tab.label}</span>
              {tab.label === '消息' && unreadCount > 0 && (
                <Badge className="absolute -top-0.5 right-0 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
