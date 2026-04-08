import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import UserAvatar from '@/components/shared/UserAvatar';
import LoadingState from '@/components/shared/LoadingState';
import { useFriends } from '@/hooks/useFriends';
import { useFrequentPartners } from '@/hooks/useCoParticipation';
import { useSendGroupInviteCard } from '@/hooks/useDirectMessages';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  groupId: string;
  groupAddress: string;
  groupStartTime: string;
  totalSlots: number;
  neededSlots: number;
  existingMemberIds: string[];
  isHost: boolean;
}

export default function InviteFriendsDialog({
  groupId,
  groupAddress,
  groupStartTime,
  totalSlots,
  neededSlots,
  existingMemberIds,
  isHost,
}: Props) {
  const { user, profile } = useAuth();
  const { data: friends = [], isLoading: friendsLoading } = useFriends();
  const { data: frequentPartners = [], isLoading: partnersLoading } = useFrequentPartners();
  const sendCard = useSendGroupInviteCard();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const isLoading = friendsLoading || partnersLoading;

  // Filter out friends already in the group
  const availableFriends = friends.filter((f: any) => !existingMemberIds.includes(f.profile.id));

  // Frequent partners who are also friends and not already in the group
  const friendIds = new Set(availableFriends.map((f: any) => f.profile.id));
  const frequentAvailable = frequentPartners.filter(
    (p) => friendIds.has(p.userId)
  );
  const frequentIds = new Set(frequentAvailable.map((p) => p.userId));
  const otherFriends = availableFriends.filter((f: any) => !frequentIds.has(f.profile.id));

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleInvite = async () => {
    if (!user || !profile) return;
    setSending(true);
    try {
      for (const inviteeId of selected) {
        // For host invite: also auto-add via group_invitations trigger
        if (isHost) {
          await supabase
            .from('group_invitations')
            .insert({ inviter_id: user.id, invitee_id: inviteeId, group_id: groupId });
        }

        // Send DM invite card regardless of host status
        await sendCard.mutateAsync({
          receiverId: inviteeId,
          meta: {
            group_id: groupId,
            is_host_invite: isHost,
            inviter_id: user.id,
            inviter_name: profile.nickname || '用户',
            group_address: groupAddress,
            group_start_time: groupStartTime,
            total_slots: totalSlots,
            needed_slots: neededSlots,
          },
        });
      }

      toast({
        title: '邀请已发送',
        description: isHost
          ? `已邀请 ${selected.length} 位好友加入拼团`
          : `已发送邀请卡片给 ${selected.length} 位好友`,
      });
      setSelected([]);
      setOpen(false);
    } catch (err: any) {
      toast({ title: '邀请失败', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <UserPlus className="h-4 w-4" /> 邀请好友
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>邀请好友加入拼团</DialogTitle>
        </DialogHeader>
        {!isHost && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            你不是房主，好友收到邀请后申请加入需经房主审核。
          </p>
        )}
        {isLoading ? <LoadingState /> : availableFriends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">没有可邀请的好友</p>
        ) : (
          <div className="space-y-1">
            {frequentAvailable.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-1 pt-1 pb-0.5">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-xs font-medium text-orange-500">常约牌友</span>
                </div>
                {frequentAvailable.map((p) => (
                  <label
                    key={p.userId}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.includes(p.userId)}
                      onCheckedChange={() => toggleSelect(p.userId)}
                    />
                    <UserAvatar nickname={p.nickname} avatar={p.avatarUrl || undefined} size="sm" />
                    <span className="text-sm font-medium flex-1 truncate">{p.nickname}</span>
                    <span className="text-xs text-muted-foreground shrink-0">共局 {p.coCount} 次</span>
                  </label>
                ))}
                {otherFriends.length > 0 && (
                  <div className="px-1 pt-2 pb-0.5">
                    <span className="text-xs text-muted-foreground">其他好友</span>
                  </div>
                )}
              </>
            )}
            {otherFriends.map((f: any) => (
              <label
                key={f.profile.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(f.profile.id)}
                  onCheckedChange={() => toggleSelect(f.profile.id)}
                />
                <UserAvatar nickname={f.profile.nickname || ''} avatar={f.profile.avatar_url || undefined} size="sm" />
                <span className="text-sm font-medium flex-1 truncate">{f.profile.nickname}</span>
              </label>
            ))}
          </div>
        )}
        <Button
          className="w-full mt-2"
          disabled={selected.length === 0 || sending}
          onClick={handleInvite}
        >
          {sending ? '发送中...' : `邀请 ${selected.length} 人`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
