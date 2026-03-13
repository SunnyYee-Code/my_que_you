import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import UserAvatar from '@/components/shared/UserAvatar';
import LoadingState from '@/components/shared/LoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupDetail } from '@/hooks/useGroups';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { ArrowLeft, Send, Users, Mic, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { validateNoBannedWords } from '@/lib/banned-words';
import { useToast } from '@/hooks/use-toast';

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: group, isLoading: groupLoading } = useGroupDetail(id);
  const { data: messages = [], isLoading: msgLoading } = useMessages(id);
  const sendMessage = useSendMessage();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (groupLoading || msgLoading) return <div className="flex items-center justify-center h-screen"><LoadingState /></div>;
  if (!group) return <div className="p-4">聊天室不存在</div>;

  const members = group.members || [];

  const send = async () => {
    if (!input.trim() || !id) return;
    const bannedError = await validateNoBannedWords(input);
    if (bannedError) {
      toast({ title: bannedError, variant: 'destructive' });
      return;
    }
    await sendMessage.mutateAsync({ groupId: id, content: input.trim() });
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="font-medium text-sm">拼团聊天室</p>
          <p className="text-xs text-muted-foreground">{members.length}人</p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Users className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>成员列表</SheetTitle></SheetHeader>
            <div className="space-y-3 mt-4">
              {members.map(m => m.profiles && (
                <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/profile/${m.user_id}`)}>
                  <UserAvatar nickname={m.profiles.nickname || ''} size="sm" />
                  <span className="text-sm">{m.profiles.nickname}</span>
                  {m.user_id === group.host_id && <span className="text-xs bg-gold/20 text-gold px-1.5 rounded">房主</span>}
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.map(msg => {
          const isSelf = msg.sender_id === user?.id;
          const sender = msg.sender;
          return (
            <div key={msg.id} className={cn('flex gap-2', isSelf && 'flex-row-reverse')}>
              {!isSelf && sender && <UserAvatar nickname={sender.nickname || ''} size="sm" />}
              <div className={cn('max-w-[70%]')}>
                {!isSelf && sender && <p className="text-xs text-muted-foreground mb-1">{sender.nickname}</p>}
                <div className={cn(
                  'px-3 py-2 rounded-2xl text-sm',
                  isSelf ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'
                )}>
                  {msg.content}
                </div>
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
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" disabled>
            <Mic className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" disabled>
            <MapPin className="h-5 w-5" />
          </Button>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="输入消息..."
            onKeyDown={e => e.key === 'Enter' && send()}
            className="flex-1"
          />
          <Button size="icon" onClick={send} disabled={!input.trim() || sendMessage.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
