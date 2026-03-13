import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/shared/UserAvatar';
import CreditBadge from '@/components/shared/CreditBadge';
import { useAuth } from '@/contexts/AuthContext';

export default function UserDropdown() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user || !profile) return null;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0">
          <UserAvatar nickname={profile.nickname || '用户'} avatar={profile.avatar_url || undefined} size="sm" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-3 py-3">
          <UserAvatar nickname={profile.nickname || '用户'} avatar={profile.avatar_url || undefined} size="md" />
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-sm font-semibold truncate">{profile.nickname || '用户'}</span>
            <CreditBadge score={profile.credit_score} />
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={`/profile/${user.id}`} className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            个人中心
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            账号设置
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin" className="flex items-center gap-2 cursor-pointer text-primary">
                <ShieldCheck className="h-4 w-4" />
                管理后台
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
