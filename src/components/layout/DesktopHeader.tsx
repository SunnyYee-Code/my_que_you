import { Link, useLocation } from 'react-router-dom';
import { Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadCount } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import CitySearchSelect from './CitySearchSelect';
import UserDropdown from './UserDropdown';

const navLinks = [
  { to: '/community', label: '拼团社区' },
  { to: '/my-groups', label: '我的拼团' },
  { to: '/friends', label: '好友' },
  { to: '/host/requests', label: '审核管理' },
];

export default function DesktopHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const unreadCount = useUnreadCount();

  return (
    <header className="hidden md:flex items-center justify-between h-16 px-6 lg:px-10 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🀄</span>
          <span className="font-display text-xl text-primary font-bold">雀友聚</span>
        </Link>

        <CitySearchSelect />

        {user && (
          <nav className="flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}>
                <Button
                  variant={location.pathname === link.to ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'text-sm',
                    location.pathname === link.to && 'bg-primary/10 text-primary'
                  )}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link to="/group/create">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                创建拼团
              </Button>
            </Link>

            <Link to="/notifications" className="relative">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Bell className="h-4 w-4" />
              </Button>
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs bg-destructive text-destructive-foreground">
                  {unreadCount}
                </Badge>
              )}
            </Link>

            <UserDropdown />
          </>
        ) : (
          <Link to="/login">
            <Button size="sm">登录</Button>
          </Link>
        )}
      </div>
    </header>
  );
}
