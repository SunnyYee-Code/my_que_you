import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import CitySearchSelect from '@/components/layout/CitySearchSelect';
import UserDropdown from '@/components/layout/UserDropdown';

export default function HomeNavBar() {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between h-16 px-6 lg:px-20 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🀄</span>
          <span className="font-display text-xl text-primary font-bold hidden sm:inline">雀友聚</span>
        </Link>
        <CitySearchSelect />
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link to="/group/create">
              <Button size="sm" className="gap-1.5 rounded-full">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">创建拼团</span>
              </Button>
            </Link>
            <UserDropdown />
          </>
        ) : (
          <Link to="/login">
            <Button size="sm" className="rounded-full px-6">登录</Button>
          </Link>
        )}
      </div>
    </header>
  );
}
