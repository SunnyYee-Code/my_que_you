/**
 * T15 4.3.4 俱乐部 — 俱乐部详情底部弹出面板
 */
import { useState } from 'react';
import { Users, Megaphone, Settings, Check, X, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import UserAvatar from '@/components/shared/UserAvatar';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { canManageClub, validateAnnouncementContent, roleName } from '@/lib/clubs';
import type { Club } from '@/lib/clubs';
import {
  useClubMembers,
  useClubPendingMembers,
  useClubAnnouncements,
  useReviewClubMember,
  useRemoveClubMember,
  useCreateAnnouncement,
  useDeleteAnnouncement,
} from '@/hooks/useClubs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ClubDetailSheetProps {
  club: Club | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ClubDetailSheet({ club, open, onOpenChange }: ClubDetailSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcementContent, setAnnouncementContent] = useState('');
  const [showAnnouncementInput, setShowAnnouncementInput] = useState(false);

  const isManager = canManageClub(club?.myRole ?? null);

  const { data: members = [], isLoading: membersLoading } = useClubMembers(club?.id);
  const { data: pendingMembers = [] } = useClubPendingMembers(isManager ? club?.id : undefined);
  const { data: announcements = [], isLoading: announcementsLoading } = useClubAnnouncements(club?.id);

  const reviewMember = useReviewClubMember();
  const removeMember = useRemoveClubMember();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const handleReview = async (memberId: string, approve: boolean) => {
    if (!club) return;
    try {
      await reviewMember.mutateAsync({ clubId: club.id, memberId, approve });
      toast({ title: approve ? '已通过申请' : '已拒绝申请' });
    } catch (err: any) {
      toast({ title: '操作失败', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemove = async (userId: string) => {
    if (!club) return;
    try {
      await removeMember.mutateAsync({ clubId: club.id, userId });
      toast({ title: '已移除成员' });
    } catch (err: any) {
      toast({ title: '操作失败', description: err.message, variant: 'destructive' });
    }
  };

  const handlePostAnnouncement = async () => {
    if (!club) return;
    const err = validateAnnouncementContent(announcementContent);
    if (err) {
      toast({ title: err, variant: 'destructive' });
      return;
    }
    try {
      await createAnnouncement.mutateAsync({ clubId: club.id, content: announcementContent });
      toast({ title: '公告已发布' });
      setAnnouncementContent('');
      setShowAnnouncementInput(false);
    } catch (err: any) {
      toast({ title: '发布失败', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!club) return;
    try {
      await deleteAnnouncement.mutateAsync({ clubId: club.id, announcementId });
      toast({ title: '公告已删除' });
    } catch (err: any) {
      toast({ title: '删除失败', description: err.message, variant: 'destructive' });
    }
  };

  if (!club) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <UserAvatar nickname={club.name} avatar={club.avatarUrl || undefined} size="sm" />
            <span>{club.name}</span>
            {!club.isPublic && <Badge variant="outline" className="text-[10px]">私密</Badge>}
          </SheetTitle>
          {club.description && (
            <p className="text-xs text-muted-foreground text-left">{club.description}</p>
          )}
        </SheetHeader>

        <Tabs defaultValue="members" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="members" className="flex-1">
              成员 {members.length > 0 && <span className="ml-1 text-[10px]">({members.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex-1">公告</TabsTrigger>
            {isManager && pendingMembers.length > 0 && (
              <TabsTrigger value="pending" className="flex-1">
                待审核 <span className="ml-1 text-[10px] text-destructive">({pendingMembers.length})</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* 成员列表 */}
          <TabsContent value="members" className="mt-3 space-y-2">
            {membersLoading ? (
              <LoadingState />
            ) : members.length === 0 ? (
              <EmptyState title="暂无成员" description="成为第一个加入的人吧" />
            ) : (
              members.map(member => (
                <div key={member.id} className="flex items-center gap-3 py-2">
                  <UserAvatar
                    nickname={member.profile.nickname}
                    avatar={member.profile.avatarUrl || undefined}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{member.profile.nickname}</span>
                      {member.role !== 'member' && (
                        <Badge variant="secondary" className="text-[10px]">
                          {roleName(member.role)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(member.joinedAt), 'yyyy年M月d日加入', { locale: zhCN })}
                    </p>
                  </div>
                  {isManager && member.userId !== user?.id && member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(member.userId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* 公告 */}
          <TabsContent value="announcements" className="mt-3 space-y-3">
            {isManager && (
              <div>
                {showAnnouncementInput ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="写一条公告..."
                      value={announcementContent}
                      onChange={(e) => setAnnouncementContent(e.target.value)}
                      className="resize-none"
                      rows={3}
                      maxLength={500}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handlePostAnnouncement}
                        disabled={createAnnouncement.isPending}
                      >
                        发布
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setShowAnnouncementInput(false); setAnnouncementContent(''); }}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs"
                    onClick={() => setShowAnnouncementInput(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    发布公告
                  </Button>
                )}
              </div>
            )}

            {announcementsLoading ? (
              <LoadingState />
            ) : announcements.length === 0 ? (
              <EmptyState
                icon={<Megaphone className="h-6 w-6" />}
                title="暂无公告"
                description={isManager ? "发布一条公告让成员了解最新动态" : "管理员暂未发布公告"}
              />
            ) : (
              announcements.map(ann => (
                <div key={ann.id} className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {ann.isPinned && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5">
                          置顶
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {ann.author.nickname} · {format(new Date(ann.createdAt), 'M月d日', { locale: zhCN })}
                      </span>
                    </div>
                    {(isManager || ann.authorId === user?.id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm">{ann.content}</p>
                </div>
              ))
            )}
          </TabsContent>

          {/* 待审核 */}
          {isManager && (
            <TabsContent value="pending" className="mt-3 space-y-2">
              {pendingMembers.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title="没有待审核申请"
                  description="新申请会在这里显示"
                />
              ) : (
                pendingMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-3 py-2">
                    <UserAvatar
                      nickname={member.profile.nickname}
                      avatar={member.profile.avatarUrl || undefined}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{member.profile.nickname}</span>
                      <p className="text-xs text-muted-foreground">申请加入</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="default"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleReview(member.id, true)}
                        disabled={reviewMember.isPending}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleReview(member.id, false)}
                        disabled={reviewMember.isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
