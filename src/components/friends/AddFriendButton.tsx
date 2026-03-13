import { Button } from '@/components/ui/button';
import { useFriendshipStatus, useSendFriendRequest } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, UserCheck, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  targetUserId: string;
  groupId?: string;
  size?: 'sm' | 'icon';
}

export default function AddFriendButton({ targetUserId, groupId, size = 'sm' }: Props) {
  const { user } = useAuth();
  const { data: friendship, isLoading } = useFriendshipStatus(targetUserId);
  const sendRequest = useSendFriendRequest();
  const { toast } = useToast();

  if (!user || user.id === targetUserId || isLoading) return null;

  // Already friends
  if (friendship?.status === 'accepted') {
    return (
      <Button variant="ghost" size={size} disabled className="gap-1 text-muted-foreground">
        <UserCheck className="h-3.5 w-3.5" />
        {size !== 'icon' && <span className="text-xs">已是好友</span>}
      </Button>
    );
  }

  // Pending request
  if (friendship?.status === 'pending') {
    return (
      <Button variant="ghost" size={size} disabled className="gap-1 text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {size !== 'icon' && <span className="text-xs">已申请</span>}
      </Button>
    );
  }

  const handleAdd = async () => {
    try {
      await sendRequest.mutateAsync({ friendId: targetUserId, groupId });
      toast({ title: '好友请求已发送' });
    } catch (err: any) {
      toast({ title: '添加失败', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Button variant="ghost" size={size} className="gap-1" onClick={handleAdd} disabled={sendRequest.isPending}>
      <UserPlus className="h-3.5 w-3.5" />
      {size !== 'icon' && <span className="text-xs">加好友</span>}
    </Button>
  );
}
