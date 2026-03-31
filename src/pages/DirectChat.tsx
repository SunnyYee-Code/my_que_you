import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UserAvatar from '@/components/shared/UserAvatar';
import LoadingState from '@/components/shared/LoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileById } from '@/hooks/useProfile';
import { useDirectMessages, useSendDirectMessage, useMarkDMsRead, GroupInviteMeta } from '@/hooks/useDirectMessages';
import { ArrowLeft, Send, MapPin, Clock, Users, Crown, LogIn, Clock4 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { validateNoBannedWords } from '@/lib/banned-words';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBlacklistStatus } from '@/hooks/useBlacklist';

// ── Invite Card ─────────────────────────────────────────────────────────────

function GroupInviteCard({
  meta,
  isSelf,
}: {
  meta: GroupInviteMeta;
  isSelf: boolean;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if already a member
  const { data: membership } = useQuery({
    queryKey: ['group-member-check', meta.group_id, user?.id],
    enabled: !!user && !!meta.group_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', meta.group_id)
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Check for existing join_request
  const { data: myRequest } = useQuery({
    queryKey: ['group-request-check', meta.group_id, user?.id],
    enabled: !!user && !!meta.group_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('join_requests')
        .select('id, status')
        .eq('group_id', meta.group_id)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Check for existing group_invitation (for host-invite auto-join check)
  const { data: myInvitation } = useQuery({
    queryKey: ['group-invitation-check', meta.group_id, user?.id],
    enabled: !!user && !!meta.group_id && meta.is_host_invite,
    queryFn: async () => {
      const { data } = await supabase
        .from('group_invitations')
        .select('id, status')
        .eq('group_id', meta.group_id)
        .eq('invitee_id', user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Apply as non-host invite
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('请先登录');
      // Get host_id from group
      const { data: group, error: gErr } = await supabase
        .from('groups')
        .select('host_id')
        .eq('id', meta.group_id)
        .single();
      if (gErr) throw gErr;
      const { error } = await supabase.from('join_requests').insert({
        group_id: meta.group_id,
        user_id: user.id,
        host_id: group.host_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-request-check', meta.group_id, user?.id] });
      toast({ title: '申请已提交', description: '等待房主审核' });
    },
    onError: (err: any) => {
      toast({ title: '申请失败', description: err.message, variant: 'destructive' });
    },
  });

  const isMember = !!membership;
  const isAlreadyApplied = myRequest?.status === 'PENDING';
  const isApproved = myRequest?.status === 'APPROVED' || isMember;

  const startDate = new Date(meta.group_start_time);

  const renderAction = () => {
    // Viewer is the sender — read-only card
    if (isSelf) return null;

    if (isApproved) {
      return (
        <Button size="sm" className="w-full mt-3 gap-1.5" onClick={() => navigate(`/group/${meta.group_id}`)}>
          <LogIn className="h-3.5 w-3.5" /> 进入拼团
        </Button>
      );
    }

    if (meta.is_host_invite) {
      // Host invite: member is already added by trigger, just navigate
      if (myInvitation?.status === 'accepted' || isMember) {
        return (
          <Button size="sm" className="w-full mt-3 gap-1.5" onClick={() => navigate(`/group/${meta.group_id}`)}>
            <LogIn className="h-3.5 w-3.5" /> 进入拼团
          </Button>
        );
      }
      // Invitation might not be created yet (race) — fallback
      return (
        <Button size="sm" className="w-full mt-3 gap-1.5" onClick={() => navigate(`/group/${meta.group_id}`)}>
          <LogIn className="h-3.5 w-3.5" /> 查看拼团
        </Button>
      );
    }

    // Non-host invite
    if (isAlreadyApplied) {
      return (
        <Button size="sm" variant="outline" className="w-full mt-3 gap-1.5" disabled>
          <Clock4 className="h-3.5 w-3.5" /> 审核中
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        className="w-full mt-3 gap-1.5"
        onClick={() => applyMutation.mutate()}
        disabled={applyMutation.isPending}
      >
        {applyMutation.isPending ? '申请中...' : '申请加入'}
      </Button>
    );
  };

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden w-52 shadow-sm',
      isSelf ? 'bg-primary/10 border-primary/20' : 'bg-card border-border'
    )}>
      {/* Card header */}
      <div className="bg-primary/10 px-3 py-2 flex items-center gap-1.5">
        {meta.is_host_invite
          ? <Crown className="h-3.5 w-3.5 text-primary shrink-0" />
          : <Users className="h-3.5 w-3.5 text-primary shrink-0" />
        }
        <span className="text-xs font-semibold text-primary truncate">
          {meta.is_host_invite ? '房主邀请你加入' : `${meta.inviter_name} 邀请你加入`}
        </span>
      </div>

      {/* Group info */}
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-start gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <span className="text-xs line-clamp-2 leading-snug">{meta.group_address}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs">{format(startDate, 'M月d日 HH:mm', { locale: zhCN })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs">共{meta.total_slots}人 · 缺{meta.needed_slots}人</span>
        </div>

        {renderAction()}
      </div>
    </div>
  );
}

// ── Main Chat Page ───────────────────────────────────────────────────────────

export default function DirectChatPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: friendProfile, isLoading: profileLoading } = useProfileById(friendId);
  const { data: messages = [], isLoading: msgLoading } = useDirectMessages(friendId);
  const { data: blacklistState } = useBlacklistStatus(friendId);
  const sendMessage = useSendDirectMessage();
  const markRead = useMarkDMsRead();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const interactionBlocked = blacklistState?.isBlocked ?? false;

  // Mark messages as read when chat opens or new messages arrive
  useEffect(() => {
    if (friendId && messages.length > 0) {
      markRead.mutate(friendId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId, messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (profileLoading || msgLoading) return <div className="flex items-center justify-center h-screen"><LoadingState /></div>;
  if (!friendProfile) return <div className="p-4">用户不存在</div>;

  const send = async () => {
    if (!input.trim() || !friendId || interactionBlocked) return;
    const bannedError = await validateNoBannedWords(input);
    if (bannedError) {
      toast({ title: bannedError, variant: 'destructive' });
      return;
    }
    try {
      await sendMessage.mutateAsync({ receiverId: friendId, content: input.trim() });
      setInput('');
    } catch (err: any) {
      toast({ title: '发送失败', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <UserAvatar nickname={friendProfile.nickname || ''} avatar={friendProfile.avatar_url || undefined} size="sm" />
        <div className="flex-1">
          <p className="font-medium text-sm">{friendProfile.nickname}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {interactionBlocked && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {blacklistState?.reason}
          </div>
        )}
        {(messages as any[]).map((msg) => {
          const isSelf = msg.sender_id === user?.id;
          const isInviteCard = msg.type === 'group_invite';

          return (
            <div key={msg.id} className={cn('flex gap-2', isSelf && 'flex-row-reverse')}>
              {!isSelf && (
                <UserAvatar nickname={friendProfile.nickname || ''} avatar={friendProfile.avatar_url || undefined} size="sm" />
              )}
              <div className={cn('max-w-[75%]')}>
                {isInviteCard && msg.metadata ? (
                  <GroupInviteCard meta={msg.metadata as GroupInviteMeta} isSelf={isSelf} />
                ) : (
                  <div className={cn(
                    'px-3 py-2 rounded-2xl text-sm',
                    isSelf ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'
                  )}>
                    {msg.content}
                  </div>
                )}
                <p className={cn('text-[10px] text-muted-foreground mt-1', isSelf && 'text-right')}>
                  {format(new Date(msg.created_at), 'HH:mm')}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-card p-3">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="输入消息..."
            onKeyDown={e => e.key === 'Enter' && send()}
            className="flex-1"
            disabled={interactionBlocked}
          />
          <Button size="icon" onClick={send} disabled={!input.trim() || sendMessage.isPending || interactionBlocked}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
