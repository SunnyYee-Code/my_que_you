import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import UserAvatar from '@/components/shared/UserAvatar';
import CreditBadge from '@/components/shared/CreditBadge';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { useFriends, useFriendRequests, useRespondFriendRequest, useDeleteFriend, useSearchUserByUid, useSendFriendRequest } from '@/hooks/useFriends';
import { useUnreadDMCounts } from '@/hooks/useDirectMessages';
import { MessageCircle, UserMinus, Check, X, Users, Search, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendshipStatus } from '@/hooks/useFriends';
import { UserCheck, Clock as ClockIcon } from 'lucide-react';

function SearchResultCard({ searchResult, user, showAddDialog, setShowAddDialog, addMessage, setAddMessage, handleSendRequest, sendRequest, navigate }: any) {
  const { data: friendship, isLoading: statusLoading } = useFriendshipStatus(searchResult?.id);

  const renderAction = () => {
    if (searchResult.id === user?.id) {
      return <span className="text-xs text-muted-foreground">这是你自己</span>;
    }
    if (statusLoading) return null;
    if (friendship?.status === 'accepted') {
      return (
        <Button variant="ghost" size="sm" disabled className="gap-1 text-muted-foreground">
          <UserCheck className="h-3.5 w-3.5" /> <span className="text-xs">已是好友</span>
        </Button>
      );
    }
    if (friendship?.status === 'pending') {
      return (
        <Button variant="ghost" size="sm" disabled className="gap-1 text-muted-foreground">
          <ClockIcon className="h-3.5 w-3.5" /> <span className="text-xs">已申请</span>
        </Button>
      );
    }
    return (
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1">
            <UserPlus className="h-3.5 w-3.5" /> 加好友
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>添加好友</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <UserAvatar nickname={searchResult.nickname || ''} avatar={searchResult.avatar_url || undefined} size="md" />
              <div>
                <p className="font-medium text-sm">{searchResult.nickname}</p>
                <p className="text-xs text-muted-foreground">UID: {searchResult.uid}</p>
              </div>
            </div>
            <Textarea
              placeholder="填写备注信息（可选）"
              value={addMessage}
              onChange={(e: any) => setAddMessage(e.target.value)}
              rows={3}
              maxLength={100}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSendRequest} disabled={sendRequest.isPending}>
              发送好友请求
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="cursor-pointer" onClick={() => navigate(`/profile/${searchResult.id}`)}>
          <UserAvatar nickname={searchResult.nickname || ''} avatar={searchResult.avatar_url || undefined} size="md" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{searchResult.nickname}</p>
          <p className="text-xs text-muted-foreground">UID: {searchResult.uid}</p>
          <CreditBadge score={searchResult.credit_score} />
        </div>
        {renderAction()}
      </CardContent>
    </Card>
  );
}

export default function FriendsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: friends = [], isLoading: friendsLoading } = useFriends();
  const { data: requests = [], isLoading: reqLoading } = useFriendRequests();
  const { data: dmCounts } = useUnreadDMCounts();
  const unreadByFriend = dmCounts?.byFriend ?? {};
  const totalUnreadDMs = dmCounts?.total ?? 0;
  const respond = useRespondFriendRequest();
  const deleteFriend = useDeleteFriend();
  const searchByUid = useSearchUserByUid();
  const sendRequest = useSendFriendRequest();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchUid, setSearchUid] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchDone, setSearchDone] = useState(false);
  const [addMessage, setAddMessage] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleRespond = async (friendshipId: string, accept: boolean) => {
    try {
      await respond.mutateAsync({ friendshipId, accept });
      toast({ title: accept ? '已接受好友请求' : '已拒绝好友请求' });
    } catch (err: any) {
      toast({ title: '操作失败', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (friendshipId: string) => {
    try {
      await deleteFriend.mutateAsync(friendshipId);
      toast({ title: '已删除好友' });
      setDeletingId(null);
    } catch (err: any) {
      toast({ title: '删除失败', description: err.message, variant: 'destructive' });
    }
  };

  const handleSearch = async () => {
    if (!searchUid.trim()) return;
    try {
      const result = await searchByUid.mutateAsync(searchUid.trim());
      setSearchResult(result);
      setSearchDone(true);
    } catch {
      setSearchResult(null);
      setSearchDone(true);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;
    try {
      await sendRequest.mutateAsync({ friendId: searchResult.id, message: addMessage || undefined });
      toast({ title: '好友请求已发送' });
      setShowAddDialog(false);
      setSearchResult(null);
      setSearchUid('');
      setSearchDone(false);
      setAddMessage('');
    } catch (err: any) {
      toast({ title: '添加失败', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">好友</h1>

        <Tabs defaultValue="list">
          <TabsList className="w-full">
            <TabsTrigger value="list" className="flex-1">
              好友列表
              {friends.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1 text-xs">{friends.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex-1">
              好友请求
              {requests.length > 0 && <Badge className="ml-1.5 h-5 min-w-5 px-1 text-xs bg-destructive text-destructive-foreground">{requests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1">
              添加好友
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4 space-y-2">
            {friendsLoading ? <LoadingState /> : friends.length === 0 ? (
              <EmptyState icon={<Users className="h-12 w-12" />} title="暂无好友" description="通过UID搜索添加好友吧" />
            ) : (
              friends.map((f: any) => (
                <Card key={f.friendshipId}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="cursor-pointer" onClick={() => navigate(`/profile/${f.profile.id}`)}>
                      <UserAvatar nickname={f.profile.nickname || ''} avatar={f.profile.avatar_url || undefined} size="md" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{f.profile.nickname}</p>
                      <CreditBadge score={f.profile.credit_score} />
                    </div>
                    {unreadByFriend[f.profile.id] > 0 && (
                      <Badge className="shrink-0 h-5 min-w-5 px-1.5 text-xs bg-destructive text-destructive-foreground">
                        {unreadByFriend[f.profile.id]}
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(`/dm/${f.profile.id}`)}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Dialog open={deletingId === f.friendshipId} onOpenChange={(o) => !o && setDeletingId(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => setDeletingId(f.friendshipId)}>
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>确认删除好友？</DialogTitle></DialogHeader>
                        <p className="text-sm text-muted-foreground">删除后将无法直接聊天，需要重新添加。</p>
                        <DialogFooter>
                          <Button variant="destructive" onClick={() => handleDelete(f.friendshipId)}>确认删除</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-4 space-y-2">
            {reqLoading ? <LoadingState /> : requests.length === 0 ? (
              <EmptyState icon={<Users className="h-12 w-12" />} title="暂无好友请求" description="等待别人添加你吧" />
            ) : (
              requests.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="cursor-pointer" onClick={() => navigate(`/profile/${r.user_profile.id}`)}>
                        <UserAvatar nickname={r.user_profile.nickname || ''} avatar={r.user_profile.avatar_url || undefined} size="md" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{r.user_profile.nickname}</p>
                        <p className="text-xs text-muted-foreground">想添加你为好友</p>
                      </div>
                      <Button size="sm" variant="default" className="gap-1" onClick={() => handleRespond(r.id, true)} disabled={respond.isPending}>
                        <Check className="h-3.5 w-3.5" /> 接受
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleRespond(r.id, false)} disabled={respond.isPending}>
                        <X className="h-3.5 w-3.5" /> 拒绝
                      </Button>
                    </div>
                    {r.message && (
                      <div className="ml-11 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                        备注：{r.message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="add" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="输入对方UID搜索"
                value={searchUid}
                onChange={e => { setSearchUid(e.target.value); setSearchDone(false); }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searchByUid.isPending || !searchUid.trim()}>
                <Search className="h-4 w-4 mr-1" /> 搜索
              </Button>
            </div>

            {searchByUid.isPending && <LoadingState />}

            {searchDone && !searchResult && (
              <EmptyState icon={<Users className="h-12 w-12" />} title="未找到用户" description="请检查UID是否正确" />
            )}

            {searchResult && (
              <SearchResultCard
                searchResult={searchResult}
                user={user}
                showAddDialog={showAddDialog}
                setShowAddDialog={setShowAddDialog}
                addMessage={addMessage}
                setAddMessage={setAddMessage}
                handleSendRequest={handleSendRequest}
                sendRequest={sendRequest}
                navigate={navigate}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
