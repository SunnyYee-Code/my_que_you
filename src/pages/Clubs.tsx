/**
 * T15 4.3.4 俱乐部 — 俱乐部主页
 */
import { useState } from 'react';
import { Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/components/layout/AppLayout';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import ClubCard from '@/components/clubs/ClubCard';
import CreateClubDialog from '@/components/clubs/CreateClubDialog';
import ClubDetailSheet from '@/components/clubs/ClubDetailSheet';
import { useClubs, useMyClubs, useJoinClub, useLeaveClub } from '@/hooks/useClubs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import type { Club } from '@/lib/clubs';

export default function ClubsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: allClubs = [], isLoading: allLoading } = useClubs();
  const { data: myClubs = [], isLoading: myLoading } = useMyClubs();

  const joinClub = useJoinClub();
  const leaveClub = useLeaveClub();

  const handleJoin = async (club: Club) => {
    if (!user) { navigate('/login'); return; }
    try {
      const status = await joinClub.mutateAsync({ clubId: club.id, isPublic: club.isPublic });
      toast({
        title: club.isPublic ? '已成功加入俱乐部' : '申请已提交，等待审核',
        description: club.isPublic ? undefined : '管理员审核通过后即可加入',
      });
    } catch (err: any) {
      if (err.code === '23505') {
        toast({ title: '你已经是该俱乐部成员了' });
      } else {
        toast({ title: '操作失败', description: err.message, variant: 'destructive' });
      }
    }
  };

  const handleLeave = async (club: Club) => {
    try {
      await leaveClub.mutateAsync(club.id);
      toast({ title: '已退出俱乐部' });
    } catch (err: any) {
      toast({ title: '退出失败', description: err.message, variant: 'destructive' });
    }
  };

  const handleCardClick = (club: Club) => {
    setSelectedClub(club);
    setSheetOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* 顶部标题行 */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">俱乐部</h1>
          {user && <CreateClubDialog onCreated={() => {}} />}
        </div>

        <Tabs defaultValue={user ? 'mine' : 'discover'}>
          <TabsList className="w-full">
            {user && <TabsTrigger value="mine" className="flex-1">我的俱乐部</TabsTrigger>}
            <TabsTrigger value="discover" className="flex-1">发现俱乐部</TabsTrigger>
          </TabsList>

          {/* 我的俱乐部 */}
          {user && (
            <TabsContent value="mine" className="mt-4">
              {myLoading ? (
                <LoadingState />
              ) : myClubs.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-8 w-8" />}
                  title="还没有加入任何俱乐部"
                  description="去「发现俱乐部」找找看，或者创建自己的俱乐部"
                  actionLabel="发现俱乐部"
                  onAction={() => {
                    const tab = document.querySelector('[value="discover"]') as HTMLElement;
                    tab?.click();
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {myClubs.map(club => (
                    <ClubCard
                      key={club.id}
                      club={club}
                      onLeave={handleLeave}
                      onClick={handleCardClick}
                      isLeaving={leaveClub.isPending && leaveClub.variables === club.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* 发现俱乐部 */}
          <TabsContent value="discover" className="mt-4">
            {allLoading ? (
              <LoadingState />
            ) : allClubs.length === 0 ? (
              <EmptyState
                icon={<Users className="h-8 w-8" />}
                title="还没有俱乐部"
                description="成为第一个创建俱乐部的人"
                actionLabel={user ? "创建俱乐部" : undefined}
                onAction={user ? undefined : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {allClubs.map(club => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                    onClick={handleCardClick}
                    isJoining={joinClub.isPending && joinClub.variables?.clubId === club.id}
                    isLeaving={leaveClub.isPending && leaveClub.variables === club.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 详情弹出面板 */}
      <ClubDetailSheet
        club={selectedClub}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </AppLayout>
  );
}
