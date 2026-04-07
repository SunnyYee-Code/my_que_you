/**
 * T15 4.3.5 长期局 — 长期局主页
 */
import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/components/layout/AppLayout';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import RecurringGameCard from '@/components/recurring-games/RecurringGameCard';
import CreateRecurringGameDialog from '@/components/recurring-games/CreateRecurringGameDialog';
import RecurringGameDetailSheet from '@/components/recurring-games/RecurringGameDetailSheet';
import { useRecurringGames, useMyRecurringGames, useJoinRecurringGame, useLeaveRecurringGame } from '@/hooks/useRecurringGames';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import type { RecurringGame } from '@/lib/recurring-games';

export default function RecurringGamesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedGame, setSelectedGame] = useState<RecurringGame | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: allGames = [], isLoading: allLoading } = useRecurringGames();
  const { data: myGames = [], isLoading: myLoading } = useMyRecurringGames();

  const joinGame = useJoinRecurringGame();
  const leaveGame = useLeaveRecurringGame();

  const handleJoin = async (game: RecurringGame) => {
    if (!user) { navigate('/login'); return; }
    try {
      await joinGame.mutateAsync({ gameId: game.id });
      toast({ title: '申请已提交，等待组织者确认' });
    } catch (err: any) {
      if (err.code === '23505') {
        toast({ title: '你已经申请过了' });
      } else {
        toast({ title: '申请失败', description: err.message, variant: 'destructive' });
      }
    }
  };

  const handleLeave = async (game: RecurringGame) => {
    try {
      await leaveGame.mutateAsync(game.id);
      toast({ title: '已退出长期局' });
    } catch (err: any) {
      toast({ title: '退出失败', description: err.message, variant: 'destructive' });
    }
  };

  const handleCardClick = (game: RecurringGame) => {
    setSelectedGame(game);
    setSheetOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* 顶部标题行 */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">长期局</h1>
          {user && <CreateRecurringGameDialog onCreated={() => {}} />}
        </div>

        <Tabs defaultValue={user ? 'mine' : 'discover'}>
          <TabsList className="w-full">
            {user && <TabsTrigger value="mine" className="flex-1">我的长期局</TabsTrigger>}
            <TabsTrigger value="discover" className="flex-1">发现长期局</TabsTrigger>
          </TabsList>

          {/* 我的长期局 */}
          {user && (
            <TabsContent value="mine" className="mt-4">
              {myLoading ? (
                <LoadingState />
              ) : myGames.length === 0 ? (
                <EmptyState
                  icon={<CalendarClock className="h-8 w-8" />}
                  title="还没有参与任何长期局"
                  description="去「发现长期局」找找看，或者创建一个固定局"
                  actionLabel="发现长期局"
                  onAction={() => {
                    const tab = document.querySelector('[value="discover"]') as HTMLElement;
                    tab?.click();
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {myGames.map(game => (
                    <RecurringGameCard
                      key={game.id}
                      game={game}
                      onLeave={handleLeave}
                      onClick={handleCardClick}
                      isLeaving={leaveGame.isPending && leaveGame.variables === game.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* 发现长期局 */}
          <TabsContent value="discover" className="mt-4">
            {allLoading ? (
              <LoadingState />
            ) : allGames.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-8 w-8" />}
                title="暂无长期局"
                description="成为第一个发起固定局的人"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {allGames.map(game => (
                  <RecurringGameCard
                    key={game.id}
                    game={game}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                    onClick={handleCardClick}
                    isJoining={joinGame.isPending && joinGame.variables?.gameId === game.id}
                    isLeaving={leaveGame.isPending && leaveGame.variables === game.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 详情弹出面板 */}
      <RecurringGameDetailSheet
        game={selectedGame}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </AppLayout>
  );
}
