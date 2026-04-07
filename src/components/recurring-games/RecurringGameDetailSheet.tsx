/**
 * T15 4.3.5 长期局 — 详情面板（底部弹出）
 */
import { useState } from 'react';
import { Calendar, Check, MapPin, UserMinus, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import {
  formatGameSchedule,
  isOrganizer,
  MEMBER_ROLE_LABELS,
  MEMBER_STATUS_LABELS,
  SESSION_STATUS_LABELS,
  STATUS_LABELS,
  type RecurringGame,
} from '@/lib/recurring-games';
import {
  useRecurringGameMembers,
  useRecurringGameSessions,
  useReviewRecurringGameMember,
  useRemoveRecurringGameMember,
  useUpdateMemberStatus,
  useCreateSession,
  useUpdateSessionStatus,
  useUpdateRecurringGameStatus,
} from '@/hooks/useRecurringGames';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Props {
  game: RecurringGame | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RecurringGameDetailSheet({ game, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessionDate, setSessionDate] = useState('');
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  const { data: members = [], isLoading: membersLoading } = useRecurringGameMembers(game?.id);
  const { data: sessions = [], isLoading: sessionsLoading } = useRecurringGameSessions(game?.id);

  const reviewMember = useReviewRecurringGameMember();
  const removeMember = useRemoveRecurringGameMember();
  const updateStatus = useUpdateMemberStatus();
  const createSession = useCreateSession();
  const updateSessionStatus = useUpdateSessionStatus();
  const updateGameStatus = useUpdateRecurringGameStatus();

  if (!game) return null;

  const organizer = isOrganizer(game.myRole);
  const pendingMembers = members.filter(m => m.status === 'pending');
  const activeMembers = members.filter(m => m.status !== 'pending');

  const handleReview = async (memberId: string, approve: boolean) => {
    try {
      await reviewMember.mutateAsync({ gameId: game.id, memberId, approve });
      toast({ title: approve ? '已通过申请' : '已拒绝申请' });
    } catch (err: any) {
      toast({ title: '操作失败', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeMember.mutateAsync({ gameId: game.id, memberId });
      toast({ title: '已移除成员' });
    } catch (err: any) {
      toast({ title: '操作失败', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleLeave = async (memberId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'on_leave' ? 'active' : 'on_leave';
    try {
      await updateStatus.mutateAsync({ gameId: game.id, memberId, status: newStatus });
      toast({ title: newStatus === 'on_leave' ? '已设置为请假' : '已恢复为在局' });
    } catch (err: any) {
      toast({ title: '操作失败', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreateSession = async () => {
    if (!sessionDate) return;
    try {
      await createSession.mutateAsync({ gameId: game.id, sessionDate });
      toast({ title: '场次已记录' });
      setSessionDate('');
      setSessionDialogOpen(false);
    } catch (err: any) {
      if (err.code === '23505') {
        toast({ title: '该日期的场次已存在' });
      } else {
        toast({ title: '记录失败', description: err.message, variant: 'destructive' });
      }
    }
  };

  const handleSessionStatus = async (sessionId: string, status: 'confirmed' | 'cancelled') => {
    try {
      await updateSessionStatus.mutateAsync({ gameId: game.id, sessionId, status });
      toast({ title: status === 'confirmed' ? '已确认' : '已取消' });
    } catch (err: any) {
      toast({ title: '操作失败', description: err.message, variant: 'destructive' });
    }
  };

  const handleGameStatus = async (status: 'active' | 'paused' | 'ended') => {
    try {
      await updateGameStatus.mutateAsync({ gameId: game.id, status });
      toast({ title: `长期局已${STATUS_LABELS[status]}` });
    } catch (err: any) {
      toast({ title: '操作失败', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-left">{game.title}</SheetTitle>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatGameSchedule(game.weekday, game.startTime)}
            </span>
            {game.locationName && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {game.locationName}
              </span>
            )}
            {game.status !== 'active' && (
              <Badge variant="secondary">{STATUS_LABELS[game.status]}</Badge>
            )}
          </div>
          {game.description && (
            <p className="text-sm text-muted-foreground text-left">{game.description}</p>
          )}
        </SheetHeader>

        <Tabs defaultValue="members" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="members" className="flex-1">
              成员
              {pendingMembers.length > 0 && organizer && (
                <Badge className="ml-1.5 h-4 px-1 text-xs bg-destructive">{pendingMembers.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex-1">场次记录</TabsTrigger>
            {organizer && (
              <TabsTrigger value="manage" className="flex-1">管理</TabsTrigger>
            )}
          </TabsList>

          {/* 成员 Tab */}
          <TabsContent value="members" className="mt-4 space-y-3">
            {/* 待审核 */}
            {organizer && pendingMembers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">待审核 ({pendingMembers.length})</p>
                {pendingMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.profile.avatarUrl ?? undefined} />
                      <AvatarFallback>{m.profile.nickname[0]}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium">{m.profile.nickname}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-green-600"
                      onClick={() => handleReview(m.id, true)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleReview(m.id, false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* 成员列表 */}
            {membersLoading ? (
              <LoadingState />
            ) : activeMembers.length === 0 ? (
              <EmptyState
                icon={<Calendar className="h-8 w-8" />}
                title="暂无成员"
                description="等待成员申请加入"
              />
            ) : (
              <div className="space-y-2">
                {activeMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.profile.avatarUrl ?? undefined} />
                      <AvatarFallback>{m.profile.nickname[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.profile.nickname}</p>
                      <p className="text-xs text-muted-foreground">信用 {m.profile.creditScore}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        {MEMBER_ROLE_LABELS[m.role]}
                      </Badge>
                      {m.status === 'on_leave' && (
                        <Badge variant="secondary" className="text-xs text-yellow-600">
                          {MEMBER_STATUS_LABELS['on_leave']}
                        </Badge>
                      )}
                    </div>
                    {/* 组织者操作 */}
                    {organizer && m.userId !== user?.id && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-yellow-600"
                          onClick={() => handleToggleLeave(m.id, m.status)}
                        >
                          {m.status === 'on_leave' ? '复局' : '请假'}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleRemove(m.id)}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 场次记录 Tab */}
          <TabsContent value="sessions" className="mt-4 space-y-3">
            {organizer && (
              <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full">
                    + 记录场次
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xs">
                  <DialogHeader>
                    <DialogTitle>记录场次</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="session-date">日期</Label>
                      <Input
                        id="session-date"
                        type="date"
                        value={sessionDate}
                        onChange={e => setSessionDate(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={!sessionDate || createSession.isPending}
                      onClick={handleCreateSession}
                    >
                      {createSession.isPending ? '记录中…' : '确认记录'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {sessionsLoading ? (
              <LoadingState />
            ) : sessions.length === 0 ? (
              <EmptyState
                icon={<Calendar className="h-8 w-8" />}
                title="暂无场次记录"
                description={organizer ? '点击上方按钮记录本周场次' : '暂无历史场次'}
              />
            ) : (
              <div className="space-y-2">
                {sessions.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.sessionDate}</p>
                      {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                    </div>
                    <Badge
                      variant={s.status === 'confirmed' ? 'default' : s.status === 'cancelled' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {SESSION_STATUS_LABELS[s.status]}
                    </Badge>
                    {organizer && s.status === 'scheduled' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-green-600"
                          onClick={() => handleSessionStatus(s.id, 'confirmed')}
                        >
                          确认
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive"
                          onClick={() => handleSessionStatus(s.id, 'cancelled')}
                        >
                          取消
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 管理 Tab（组织者） */}
          {organizer && (
            <TabsContent value="manage" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">长期局状态管理</p>
              <div className="space-y-2">
                {game.status === 'active' && (
                  <Button
                    variant="outline"
                    className="w-full text-yellow-600 border-yellow-300"
                    onClick={() => handleGameStatus('paused')}
                  >
                    暂停长期局
                  </Button>
                )}
                {game.status === 'paused' && (
                  <Button
                    variant="outline"
                    className="w-full text-green-600 border-green-300"
                    onClick={() => handleGameStatus('active')}
                  >
                    恢复长期局
                  </Button>
                )}
                {game.status !== 'ended' && (
                  <Button
                    variant="outline"
                    className="w-full text-destructive border-destructive/30"
                    onClick={() => handleGameStatus('ended')}
                  >
                    结束长期局
                  </Button>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
