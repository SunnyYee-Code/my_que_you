import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import AppLayout from '@/components/layout/AppLayout';
import UserAvatar from '@/components/shared/UserAvatar';
import CreditBadge from '@/components/shared/CreditBadge';
import LoadingState from '@/components/shared/LoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { buildNotificationDeliveryFields, buildNotificationReachPlan } from '@/lib/notification-reach';
import { Users, BarChart3, MapPin, Shield, Search, Plus, Trash2, Pencil, MessageSquare, Star, AlertTriangle, Gamepad2, UserPlus, Ban, ChevronLeft, UserMinus, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const { toast } = useToast();
  const { user, isSuperAdmin } = useAuth();
  const { allCities } = useCity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  // ---- Data fetching ----
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at');
      if (error) throw error;
      return data;
    },
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['admin-groups-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*, host:profiles!groups_host_id_fkey(id, nickname), members:group_members(user_id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: playStyles = [] } = useQuery({
    queryKey: ['admin-play-styles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('play_styles').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*, reporter:profiles!reports_reporter_id_fkey(id, nickname), reported:profiles!reports_reported_id_fkey(id, nickname)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(nickname), target:profiles!reviews_target_id_fkey(nickname)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: appeals = [] } = useQuery({
    queryKey: ['admin-appeals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_history')
        .select('*, user:profiles!credit_history_user_id_fkey(id, nickname)')
        .eq('appeal_status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: exitRecords = [] } = useQuery({
    queryKey: ['admin-exits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_member_exits')
        .select('*, user:profiles!group_member_exits_user_id_fkey(id, nickname), kicker:profiles!group_member_exits_kicked_by_fkey(id, nickname), group:groups(id, address)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: chatGroups = [] } = useQuery({
    queryKey: ['admin-chat-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, address, status, host:profiles!groups_host_id_fkey(nickname)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: inviteBindings = [] } = useQuery({
    queryKey: ['admin-invite-bindings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_invite_bindings' as any)
        .select(`
          id,
          invite_code,
          bound_at,
          inviter:profiles!user_invite_bindings_inviter_id_fkey(id, nickname),
          invitee:profiles!user_invite_bindings_invitee_id_fkey(id, nickname)
        `)
        .order('bound_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredUsers = profiles.filter(u =>
    (u.nickname || '').includes(searchQuery) || (u.phone || '').includes(searchQuery)
  );

  const getUserRole = (userId: string) => {
    const r = userRoles.find(r => r.user_id === userId);
    return r?.role || 'user';
  };

  const stats = {
    totalUsers: profiles.length,
    activeGroups: groups.filter(g => g.status === 'OPEN' || g.status === 'FULL').length,
    completedGroups: groups.filter(g => g.status === 'COMPLETED').length,
    totalCities: allCities.length,
    totalInviteBindings: inviteBindings.length,
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    queryClient.invalidateQueries({ queryKey: ['admin-groups-full'] });
    queryClient.invalidateQueries({ queryKey: ['admin-play-styles'] });
    queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    queryClient.invalidateQueries({ queryKey: ['admin-appeals'] });
    queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
    queryClient.invalidateQueries({ queryKey: ['admin-chat-groups'] });
    queryClient.invalidateQueries({ queryKey: ['admin-exits'] });
    queryClient.invalidateQueries({ queryKey: ['admin-invite-bindings'] });
    queryClient.invalidateQueries({ queryKey: ['cities'] });
  };

  // ---- Handlers ----
  const handleAddCity = async () => {
    if (!newCityName.trim()) return;
    const cityId = newCityName.trim();
    const { error } = await supabase.from('cities').insert({ id: cityId, name: newCityName.trim() });
    if (error) toast({ title: '添加失败', description: error.message, variant: 'destructive' });
    else { toast({ title: `已添加城市: ${newCityName}` }); setNewCityName(''); invalidateAll(); }
  };

  const handleDeleteCity = async (cityId: string, cityName: string) => {
    if (!confirm(`确认删除城市 "${cityName}"？`)) return;
    const { error } = await supabase.from('cities').delete().eq('id', cityId);
    if (error) toast({ title: '删除失败', description: error.message, variant: 'destructive' });
    else { toast({ title: `已删除: ${cityName}` }); invalidateAll(); }
  };

  if (isLoading) return <AppLayout><LoadingState /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold font-display">管理后台</h1>
          {isSuperAdmin && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">超级管理员</span>}
          <SeedTestDataButton onSuccess={invalidateAll} />
          <BatchCreateUsersButton onSuccess={invalidateAll} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: '注册用户', value: stats.totalUsers, icon: Users, color: 'text-primary' },
            { label: '活跃拼团', value: stats.activeGroups, icon: BarChart3, color: 'text-green-500' },
            { label: '完成拼团', value: stats.completedGroups, icon: BarChart3, color: 'text-yellow-500' },
            { label: '开通城市', value: stats.totalCities, icon: MapPin, color: 'text-blue-500' },
            { label: '邀请绑定', value: stats.totalInviteBindings, icon: UserPlus, color: 'text-amber-500' },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex-wrap h-auto">
            <TabsTrigger value="users" className="flex-1">用户</TabsTrigger>
            <TabsTrigger value="groups" className="flex-1">拼团</TabsTrigger>
            <TabsTrigger value="playstyles" className="flex-1">玩法</TabsTrigger>
            <TabsTrigger value="cities" className="flex-1">城市</TabsTrigger>
            <TabsTrigger value="reports" className="flex-1">举报</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1">评价</TabsTrigger>
            <TabsTrigger value="chat" className="flex-1">聊天</TabsTrigger>
            <TabsTrigger value="invites" className="flex-1">邀请归因</TabsTrigger>
           <TabsTrigger value="appeals" className="flex-1">申诉{appeals.length > 0 && ` (${appeals.length})`}</TabsTrigger>
            <TabsTrigger value="exits" className="flex-1">退出记录</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">设置</TabsTrigger>
          </TabsList>

          {/* ===== USERS TAB ===== */}
          <TabsContent value="users" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索昵称/手机号..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              {isSuperAdmin && <CreateUserDialog onSuccess={invalidateAll} />}
            </div>
            {filteredUsers.map(profile => (
              <UserCard
                key={profile.id}
                profile={profile}
                role={getUserRole(profile.id)}
                isSuperAdmin={isSuperAdmin}
                currentUserId={user?.id || ''}
                onUpdate={invalidateAll}
              />
            ))}
          </TabsContent>

          {/* ===== GROUPS TAB ===== */}
          <TabsContent value="groups" className="mt-4 space-y-3">
            {groups.length === 0 ? <EmptyCard text="暂无拼团" /> : groups.map(group => (
              <GroupCard key={group.id} group={group} isSuperAdmin={isSuperAdmin} onUpdate={invalidateAll} />
            ))}
          </TabsContent>

          {/* ===== PLAY STYLES TAB ===== */}
          <TabsContent value="playstyles" className="mt-4 space-y-3">
            <PlayStylesManager styles={playStyles} isSuperAdmin={isSuperAdmin} onUpdate={invalidateAll} />
          </TabsContent>

          {/* ===== CITIES TAB ===== */}
          <TabsContent value="cities" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Input placeholder="新增城市名称" value={newCityName} onChange={e => setNewCityName(e.target.value)} />
              <Button onClick={handleAddCity}><Plus className="h-4 w-4" /></Button>
            </div>
            {allCities.map(city => (
              <Card key={city.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{city.name}</span>
                  </div>
                  {isSuperAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteCity(city.id, city.name)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ===== REPORTS TAB ===== */}
          <TabsContent value="reports" className="mt-4 space-y-3">
            {reports.length === 0 ? <EmptyCard text="暂无举报" /> : reports.map(report => (
              <ReportCard key={report.id} report={report} isSuperAdmin={isSuperAdmin} onUpdate={invalidateAll} />
            ))}
          </TabsContent>

          {/* ===== REVIEWS TAB ===== */}
          <TabsContent value="reviews" className="mt-4 space-y-3">
            {reviews.length === 0 ? <EmptyCard text="暂无评价" /> : reviews.map(review => (
              <ReviewCard key={review.id} review={review} isSuperAdmin={isSuperAdmin} onUpdate={invalidateAll} />
            ))}
          </TabsContent>

          {/* ===== CHAT TAB ===== */}
          <TabsContent value="chat" className="mt-4 space-y-3">
            {chatGroups.length === 0 ? <EmptyCard text="暂无聊天室" /> : chatGroups.map(cg => (
              <ChatGroupCard key={cg.id} group={cg} isSuperAdmin={isSuperAdmin} onUpdate={invalidateAll} />
            ))}
          </TabsContent>

          <TabsContent value="invites" className="mt-4 space-y-3">
            {inviteBindings.length === 0 ? <EmptyCard text="暂无邀请码绑定记录" /> : inviteBindings.map((binding: any) => (
              <Card key={binding.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{binding.invite_code}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(binding.bound_at), 'MM-dd HH:mm')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    邀请人：{binding.inviter?.nickname || '未知用户'} → 被邀请人：{binding.invitee?.nickname || '未知用户'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ===== APPEALS TAB ===== */}
          <TabsContent value="appeals" className="mt-4 space-y-3">
            {appeals.length === 0 ? <EmptyCard text="暂无待处理申诉" /> : appeals.map(appeal => (
              <AppealCard key={appeal.id} appeal={appeal} onUpdate={invalidateAll} />
            ))}
          </TabsContent>

          {/* ===== EXITS TAB ===== */}
          <TabsContent value="exits" className="mt-4 space-y-3">
            {exitRecords.length === 0 ? <EmptyCard text="暂无退出记录" /> : exitRecords.map((record: any) => (
              <ExitRecordCard key={record.id} record={record} onUpdate={invalidateAll} />
            ))}
          </TabsContent>

          {/* ===== SETTINGS TAB ===== */}
          <TabsContent value="settings" className="mt-4 space-y-3">
            <SystemSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ---- Sub-components ----

function EmptyCard({ text }: { text: string }) {
  return (
    <Card><CardContent className="p-6 text-center text-muted-foreground"><p>{text}</p></CardContent></Card>
  );
}

// ---- Exit Record Card ----
function ExitRecordCard({ record, onUpdate }: { record: any; onUpdate: () => void }) {
  const { toast } = useToast();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState(Math.abs(record.credit_change));
  const [adjustAction, setAdjustAction] = useState<'refund' | 'modify'>('refund');

  const handleAdjust = async () => {
    try {
      const userId = record.user_id || record.user?.id;
      if (!userId) throw new Error('用户不存在');

      const originalChange = record.credit_change; // e.g. -3
      let creditDelta = 0;
      let newExitChange = originalChange;

      if (adjustAction === 'refund') {
        // Full refund: restore the deducted points
        creditDelta = Math.abs(originalChange);
        newExitChange = 0;
      } else {
        // Modify: set new deduction amount
        const newDeduction = -Math.abs(adjustAmount);
        creditDelta = Math.abs(originalChange) - Math.abs(adjustAmount); // positive = refund, negative = more deduction
        newExitChange = newDeduction;
      }

      // Update exit record
      await supabase.from('group_member_exits').update({ credit_change: newExitChange }).eq('id', record.id);

      // Adjust user credit
      if (creditDelta !== 0) {
        const { data: profile } = await supabase.from('profiles').select('credit_score').eq('id', userId).single();
        const newScore = Math.max(0, (profile?.credit_score || 0) + creditDelta);
        await supabase.from('profiles').update({ credit_score: newScore }).eq('id', userId);

        // Record credit history
        await supabase.from('credit_history').insert({
          user_id: userId,
          change: creditDelta,
          reason: adjustAction === 'refund' ? '管理员返还退出扣分' : `管理员调整退出扣分（${originalChange} → ${newExitChange}）`,
          group_id: record.group_id,
          can_appeal: false,
        });

        // Notify user
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'credit_change' as any,
          title: '信用分调整',
          content: creditDelta > 0
            ? `管理员已返还${creditDelta}点信用分`
            : `管理员调整信用分${creditDelta}`,
          link_to: `/profile/${userId}`,
        });
      }

      toast({ title: '已调整信用分' });
      setAdjustOpen(false);
      onUpdate();
    } catch (err: any) {
      toast({ title: '操作失败', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {record.exit_type === 'kicked' ? (
              <UserMinus className="h-4 w-4 text-destructive" />
            ) : (
              <LogOut className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {record.exit_type === 'kicked' ? '被踢出' : '主动退出'}
            </span>
            <span className="text-xs text-muted-foreground">
              {record.user?.nickname || '未知用户'}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(record.created_at), 'MM-dd HH:mm')}
          </span>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>拼团：{record.group?.address || '未知'}</p>
          {record.exit_type === 'kicked' && record.kicker && (
            <p>操作人：{record.kicker.nickname}</p>
          )}
          {record.reason && (
            <p className="bg-muted/50 p-2 rounded">理由：{record.reason}</p>
          )}
          <div className="flex items-center justify-between">
            <p>信用分变动：<span className={record.credit_change < 0 ? 'text-destructive font-medium' : record.credit_change > 0 ? 'text-green-600 font-medium' : ''}>{record.credit_change}</span></p>
            {record.credit_change < 0 && (
              <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 text-xs">调整扣分</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>调整信用分</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      用户：{record.user?.nickname} | 当前扣分：{record.credit_change}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant={adjustAction === 'refund' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAdjustAction('refund')}
                      >
                        全额返还
                      </Button>
                      <Button
                        variant={adjustAction === 'modify' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAdjustAction('modify')}
                      >
                        修改扣分
                      </Button>
                    </div>
                    {adjustAction === 'modify' && (
                      <div className="space-y-2">
                        <Label>新的扣除分数</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={adjustAmount}
                          onChange={e => setAdjustAmount(Number(e.target.value))}
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAdjust}>
                      {adjustAction === 'refund' ? '确认返还' : '确认修改'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- User Card ----
function UserCard({ profile, role, isSuperAdmin, currentUserId, onUpdate }: any) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [creditScore, setCreditScore] = useState(profile.credit_score);
  const [canCreate, setCanCreate] = useState(profile.can_create_group);
  const [canJoin, setCanJoin] = useState(profile.can_join_group);
  const [requireVerification, setRequireVerification] = useState(profile.require_email_verification ?? true);
  const [dailyCreateLimit, setDailyCreateLimit] = useState(profile.daily_create_limit ?? 5);
  const [dailyJoinLimit, setDailyJoinLimit] = useState(profile.daily_join_limit ?? 5);
  const [maxStartHours, setMaxStartHours] = useState(profile.max_start_hours ?? 24);
  const [maxDurationHours, setMaxDurationHours] = useState(profile.max_duration_hours ?? 24);
  const [newPassword, setNewPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleBan = async () => {
    const { data, error } = await supabase.functions.invoke('admin-manage-user', {
      body: { action: 'ban_user', user_id: profile.id, is_banned: !profile.is_banned },
    });
    if (error || data?.error) {
      toast({ title: '操作失败', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({ title: profile.is_banned ? `已解封 ${profile.nickname}` : `已封禁 ${profile.nickname}` });
    }
    onUpdate();
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: '图片不能超过2MB', variant: 'destructive' });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;

      // Upload avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const filePath = `${profile.id}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = urlData.publicUrl + '?t=' + Date.now();
      }

      const { error } = await supabase.from('profiles').update({
        nickname, credit_score: creditScore, can_create_group: canCreate, can_join_group: canJoin,
        require_email_verification: requireVerification,
        daily_create_limit: dailyCreateLimit,
        daily_join_limit: dailyJoinLimit,
        max_start_hours: maxStartHours,
        max_duration_hours: maxDurationHours,
        avatar_url: avatarUrl,
      }).eq('id', profile.id);
      if (error) throw error;

      // Reset password if provided
      if (newPassword) {
        const { data, error: pwErr } = await supabase.functions.invoke('admin-manage-user', {
          body: { action: 'reset_password', user_id: profile.id, new_password: newPassword },
        });
        if (pwErr || data?.error) {
          toast({ title: '密码修改失败', description: data?.error || pwErr?.message, variant: 'destructive' });
          setSaving(false);
          return;
        }
      }

      toast({ title: '已保存' });
      setEditOpen(false);
      setNewPassword('');
      setAvatarFile(null);
      setAvatarPreview(null);
      onUpdate();
    } catch (err: any) {
      toast({ title: '保存失败', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`确认删除用户 "${profile.nickname}"？此操作不可恢复！`)) return;
    const { data, error } = await supabase.functions.invoke('admin-manage-user', {
      body: { action: 'delete_user', user_id: profile.id },
    });
    if (error || data?.error) toast({ title: '删除失败', description: data?.error || error?.message, variant: 'destructive' });
    else { toast({ title: '已删除' }); onUpdate(); }
  };

  const isSelf = profile.id === currentUserId;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar nickname={profile.nickname || ''} avatar={profile.avatar_url || undefined} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{profile.nickname}</p>
                {role !== 'user' && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    role === 'super_admin' ? 'bg-destructive/10 text-destructive' 
                    : role === 'admin' ? 'bg-primary/10 text-primary' 
                    : role === 'test' ? 'bg-muted text-muted-foreground' 
                    : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {role === 'super_admin' ? '超管' : role === 'admin' ? '管理' : role === 'test' ? '测试' : role}
                  </span>
                )}
                {profile.is_banned && <Ban className="h-3 w-3 text-destructive shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground truncate">{profile.phone || '无手机号'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <CreditBadge score={profile.credit_score} />
                {!profile.can_create_group && <span className="text-[10px] text-destructive">禁创建</span>}
                {!profile.can_join_group && <span className="text-[10px] text-destructive">禁加入</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setAvatarFile(null); setAvatarPreview(null); setNewPassword(''); } }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" onClick={() => {
                  setNickname(profile.nickname || '');
                  setCreditScore(profile.credit_score);
                  setCanCreate(profile.can_create_group);
                  setCanJoin(profile.can_join_group);
                  setRequireVerification(profile.require_email_verification ?? true);
                  setDailyCreateLimit(profile.daily_create_limit ?? 5);
                  setDailyJoinLimit(profile.daily_join_limit ?? 5);
                  setMaxStartHours(profile.max_start_hours ?? 24);
                  setMaxDurationHours(profile.max_duration_hours ?? 24);
                  setNewPassword('');
                  setAvatarFile(null);
                  setAvatarPreview(null);
                }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>编辑用户</DialogTitle></DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <UserAvatar nickname={profile.nickname || ''} avatar={avatarPreview || profile.avatar_url || undefined} size="lg" />
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                        <Pencil className="h-4 w-4 text-white" />
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                      </label>
                    </div>
                    <div className="text-sm text-muted-foreground">点击头像更换<br />支持 JPG/PNG，最大 2MB</div>
                  </div>
                  <div><Label>昵称</Label><Input value={nickname} onChange={e => setNickname(e.target.value)} /></div>
                  <div><Label>新密码（留空不修改）</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="至少6位" /></div>
                  <div><Label>信用分</Label><Input type="number" value={creditScore} onChange={e => setCreditScore(Number(e.target.value))} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>每日创建上限</Label><Input type="number" min={0} max={100} value={dailyCreateLimit} onChange={e => setDailyCreateLimit(Number(e.target.value))} /></div>
                    <div><Label>每日参与上限</Label><Input type="number" min={0} max={100} value={dailyJoinLimit} onChange={e => setDailyJoinLimit(Number(e.target.value))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>开始时间上限(小时)</Label><Input type="number" min={1} value={maxStartHours} onChange={e => setMaxStartHours(Number(e.target.value))} /></div>
                    <div><Label>持续时间上限(小时)</Label><Input type="number" min={1} value={maxDurationHours} onChange={e => setMaxDurationHours(Number(e.target.value))} /></div>
                  </div>
                  <div className="flex items-center justify-between"><Label>允许创建拼团</Label><Switch checked={canCreate} onCheckedChange={setCanCreate} /></div>
                  <div className="flex items-center justify-between"><Label>允许加入拼团</Label><Switch checked={canJoin} onCheckedChange={setCanJoin} /></div>
                  <div className="flex items-center justify-between"><Label>登录需验证邮箱</Label><Switch checked={requireVerification} onCheckedChange={setRequireVerification} /></div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {!isSelf && isSuperAdmin && (
              <>
                <Button size="sm" variant={profile.is_banned ? 'default' : 'outline'} onClick={handleBan}>
                  {profile.is_banned ? '解封' : '封禁'}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Create User Dialog ----
function CreateUserDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (role !== 'test' && !email) { toast({ title: '请填写邮箱', variant: 'destructive' }); return; }
    if (!password) { toast({ title: '请填写密码', variant: 'destructive' }); return; }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-manage-user', {
      body: { action: 'create_user', email: email || undefined, password, nickname: nickname || `雀友${Date.now().toString(36)}`, role },
    });
    setLoading(false);
    if (error || data?.error) {
      toast({ title: '创建失败', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({ title: '用户已创建' });
      setOpen(false);
      setEmail(''); setPassword(''); setNickname(''); setRole('user');
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><UserPlus className="h-4 w-4 mr-1" />新增</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>新增用户</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>邮箱 {role !== 'test' ? '*' : '(可选)'}</Label><Input value={email} onChange={e => setEmail(e.target.value)} placeholder={role === 'test' ? '留空自动生成@test.com邮箱' : ''} /></div>
          <div><Label>密码 *</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <div><Label>昵称</Label><Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="留空自动生成" /></div>
          <div>
            <Label>角色</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">普通用户</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
                <SelectItem value="test">测试用户</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={loading}>{loading ? '创建中...' : '创建'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Group Card ----
function GroupCard({ group, isSuperAdmin, onUpdate }: any) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [status, setStatus] = useState(group.status);
  const [address, setAddress] = useState(group.address);
  const [gameNote, setGameNote] = useState(group.game_note || '');
  const [isVisible, setIsVisible] = useState(group.is_visible ?? true);

  const handleSave = async () => {
    const { error } = await supabase.from('groups').update({ status, address, game_note: gameNote, is_visible: isVisible }).eq('id', group.id);
    if (error) toast({ title: '保存失败', variant: 'destructive' });
    else { toast({ title: '已保存' }); setEditOpen(false); onUpdate(); }
  };

  const handleDelete = async () => {
    if (!confirm('确认删除此拼团？')) return;
    // Delete related data first
    await supabase.from('messages').delete().eq('group_id', group.id);
    await supabase.from('join_requests').delete().eq('group_id', group.id);
    await supabase.from('group_members').delete().eq('group_id', group.id);
    await supabase.from('reviews').delete().eq('group_id', group.id);
    const { error } = await supabase.from('groups').delete().eq('id', group.id);
    if (error) toast({ title: '删除失败', description: error.message, variant: 'destructive' });
    else { toast({ title: '已删除' }); onUpdate(); }
  };

  const statusLabels: Record<string, string> = {
    OPEN: '招募中', FULL: '已满', IN_PROGRESS: '进行中', COMPLETED: '已完成', CANCELLED: '已取消',
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{group.address}</p>
            <p className="text-xs text-muted-foreground">
              房主: {(group.host as any)?.nickname} · {statusLabels[group.status] || group.status} · {group.members?.length || 0}/{group.total_slots}人
              {group.is_visible === false && <span className="text-destructive ml-1">· 隐藏</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(group.start_time), 'MM/dd HH:mm')} - {format(new Date(group.end_time), 'HH:mm')}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild><Button size="sm" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>编辑拼团</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>地址</Label><Input value={address} onChange={e => setAddress(e.target.value)} /></div>
                  <div><Label>备注</Label><Textarea value={gameNote} onChange={e => setGameNote(e.target.value)} /></div>
                  <div>
                    <Label>状态</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['OPEN','FULL','IN_PROGRESS','COMPLETED','CANCELLED'].map(s => (
                          <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>社区可见</Label>
                    <Switch checked={isVisible} onCheckedChange={setIsVisible} />
                  </div>
                </div>
                <DialogFooter><Button onClick={handleSave}>保存</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            {isSuperAdmin && <Button size="sm" variant="ghost" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Play Styles Manager ----
function PlayStylesManager({ styles, isSuperAdmin, onUpdate }: { styles: any[]; isSuperAdmin: boolean; onUpdate: () => void }) {
  const { toast } = useToast();
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('play_styles').insert({ name: newName.trim() });
    if (error) toast({ title: '添加失败', description: error.message, variant: 'destructive' });
    else { toast({ title: '已添加' }); setNewName(''); onUpdate(); }
  };

  const handleSave = async (id: string) => {
    const { error } = await supabase.from('play_styles').update({ name: editName }).eq('id', id);
    if (error) toast({ title: '保存失败', variant: 'destructive' });
    else { toast({ title: '已保存' }); setEditId(null); onUpdate(); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确认删除玩法 "${name}"？`)) return;
    const { error } = await supabase.from('play_styles').delete().eq('id', id);
    if (error) toast({ title: '删除失败', variant: 'destructive' });
    else { toast({ title: '已删除' }); onUpdate(); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="新增玩法名称" value={newName} onChange={e => setNewName(e.target.value)} />
        <Button onClick={handleAdd}><Plus className="h-4 w-4" /></Button>
      </div>
      {styles.map(s => (
        <Card key={s.id}>
          <CardContent className="p-3 flex items-center justify-between">
            {editId === s.id ? (
              <div className="flex gap-2 flex-1">
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
                <Button size="sm" onClick={() => handleSave(s.id)}>保存</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>取消</Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{s.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditId(s.id); setEditName(s.name); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {isSuperAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id, s.name)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---- Report Card ----
function ReportCard({ report, isSuperAdmin, onUpdate }: any) {
  const { toast } = useToast();

  const handleStatus = async (decision: string) => {
    const { error } = await supabase.rpc('resolve_report' as any, {
      _report_id: report.id,
      _decision: decision,
    });
    if (error) {
      toast({ title: '操作失败', description: error.message, variant: 'destructive' });
      return;
    }

    const plan = buildNotificationReachPlan({
      eventKey: 'report_result',
      audienceRole: 'reported_user',
    });

    const title = decision === 'resolved' ? '举报处理结果已更新' : '举报申诉结果已更新';
    const content = decision === 'resolved'
      ? '平台已处理针对你的举报，请留意后续账号状态与社区规范。'
      : '平台已驳回针对你的举报，本次处理不会追加处罚。';

    if ((report.reported as any)?.id) {
      const notificationResult = await supabase.from('notifications').insert({
        user_id: (report.reported as any).id,
        type: 'application_update' as any,
        title,
        content,
        link_to: '/settings',
        ...buildNotificationDeliveryFields({
          plan,
          metadata: {
            report_id: report.id,
            decision,
          },
        }),
      });
      if (notificationResult.error) {
        await supabase.from('notification_delivery_logs').insert({
          user_id: (report.reported as any).id,
          event_key: 'report_result',
          audience_role: 'reported_user',
          channel: 'in_app',
          status: 'failed',
          notification_type: 'application_update',
          error_message: notificationResult.error.message,
          metadata: {
            report_id: report.id,
            decision,
          },
        } as any);
        toast({
          title: '举报结果通知发送失败',
          description: '举报状态已更新，但消息通知未发送成功，请稍后补发。',
          variant: 'destructive',
        });
      }
    }

    toast({ title: `举报已${decision === 'resolved' ? '处理' : '驳回'}` });
    onUpdate();
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('reports').delete().eq('id', report.id);
    if (error) toast({ title: '删除失败', variant: 'destructive' });
    else { toast({ title: '已删除' }); onUpdate(); }
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm"><span className="font-medium">{(report.reporter as any)?.nickname}</span> → <span className="font-medium">{(report.reported as any)?.nickname}</span></p>
            <p className="text-xs text-muted-foreground">{report.reason}</p>
            {report.detail && <p className="text-xs text-muted-foreground mt-1">{report.detail}</p>}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : report.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
            {report.status === 'pending' ? '待处理' : report.status === 'resolved' ? '已处理' : report.status}
          </span>
        </div>
        <div className="flex gap-1">
          {report.status === 'pending' && (
            <>
              <Button size="sm" onClick={() => handleStatus('resolved')}>处理</Button>
              <Button size="sm" variant="outline" onClick={() => handleStatus('rejected')}>驳回</Button>
            </>
          )}
          {isSuperAdmin && <Button size="sm" variant="ghost" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Review Card ----
function ReviewCard({ review, isSuperAdmin, onUpdate }: any) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [comment, setComment] = useState(review.comment || '');
  const [skill, setSkill] = useState(review.skill);
  const [attitude, setAttitude] = useState(review.attitude);
  const [punctuality, setPunctuality] = useState(review.punctuality);

  const handleSave = async () => {
    const { error } = await supabase.from('reviews').update({ comment, skill, attitude, punctuality }).eq('id', review.id);
    if (error) toast({ title: '保存失败', variant: 'destructive' });
    else { toast({ title: '已保存' }); setEditOpen(false); onUpdate(); }
  };

  const handleDelete = async () => {
    if (!confirm('确认删除此评价？')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', review.id);
    if (error) toast({ title: '删除失败', variant: 'destructive' });
    else { toast({ title: '已删除' }); onUpdate(); }
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm"><span className="font-medium">{(review.reviewer as any)?.nickname}</span> → <span className="font-medium">{(review.target as any)?.nickname}</span></p>
            <p className="text-xs text-muted-foreground">技术:{review.skill} 态度:{review.attitude} 守时:{review.punctuality}</p>
            {review.comment && <p className="text-xs text-muted-foreground">{review.comment}</p>}
          </div>
          <div className="flex gap-1">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild><Button size="sm" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>编辑评价</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>技术评分 (1-5)</Label><Input type="number" min={1} max={5} value={skill} onChange={e => setSkill(Number(e.target.value))} /></div>
                  <div><Label>态度评分 (1-5)</Label><Input type="number" min={1} max={5} value={attitude} onChange={e => setAttitude(Number(e.target.value))} /></div>
                  <div><Label>守时评分 (1-5)</Label><Input type="number" min={1} max={5} value={punctuality} onChange={e => setPunctuality(Number(e.target.value))} /></div>
                  <div><Label>评语</Label><Textarea value={comment} onChange={e => setComment(e.target.value)} /></div>
                </div>
                <DialogFooter><Button onClick={handleSave}>保存</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            {isSuperAdmin && <Button size="sm" variant="ghost" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Chat Group Card ----
function ChatGroupCard({ group, isSuperAdmin, onUpdate }: any) {
  const { toast } = useToast();
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(nickname)')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setMessages(data || []);
    setMessagesOpen(true);
  };

  const handleDeleteMessage = async (msgId: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', msgId);
    if (error) toast({ title: '删除失败', variant: 'destructive' });
    else {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      toast({ title: '已删除' });
    }
  };

  const handleDeleteAllMessages = async () => {
    if (!confirm('确认删除此聊天室所有消息？')) return;
    const { error } = await supabase.from('messages').delete().eq('group_id', group.id);
    if (error) toast({ title: '删除失败', variant: 'destructive' });
    else { setMessages([]); toast({ title: '已清空' }); }
  };

  return (
    <Card>
      <CardContent className="p-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium truncate">{group.address}</p>
          <p className="text-xs text-muted-foreground">房主: {(group.host as any)?.nickname} · {group.status}</p>
        </div>
        <div className="flex gap-1">
          <Dialog open={messagesOpen} onOpenChange={setMessagesOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" onClick={loadMessages}>
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>聊天记录 - {group.address}</span>
                  {isSuperAdmin && <Button size="sm" variant="destructive" onClick={handleDeleteAllMessages}>清空</Button>}
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 space-y-2 max-h-[60vh]">
                {messages.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">暂无消息</p> : messages.map(msg => (
                  <div key={msg.id} className="flex items-start justify-between gap-2 p-2 rounded bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{(msg.sender as any)?.nickname}</p>
                      <p className="text-sm break-all">{msg.content}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(msg.created_at), 'MM/dd HH:mm')}</p>
                    </div>
                    {isSuperAdmin && (
                      <Button size="sm" variant="ghost" className="shrink-0" onClick={() => handleDeleteMessage(msg.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Appeal Card ----
function AppealCard({ appeal, onUpdate }: any) {
  const { toast } = useToast();

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    const { error } = await supabase.from('credit_history').update({ appeal_status: decision }).eq('id', appeal.id);
    if (error) toast({ title: '操作失败', variant: 'destructive' });
    else { toast({ title: decision === 'approved' ? '申诉已通过' : '申诉已驳回' }); onUpdate(); }
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{(appeal.user as any)?.nickname || '未知'}</p>
            <p className="text-xs text-muted-foreground">{appeal.reason}</p>
          </div>
          <span className="text-sm font-bold text-destructive">{appeal.change}</span>
        </div>
        {appeal.appeal_reason && <p className="text-xs bg-muted/50 p-2 rounded">理由：{appeal.appeal_reason}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleDecision('approved')}>通过</Button>
          <Button size="sm" variant="outline" onClick={() => handleDecision('rejected')}>驳回</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Seed Test Data Button ----
function SeedTestDataButton({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    if (!confirm('确认生成测试数据？将创建5个测试用户和7个不同状态的拼团。')) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-test-data');
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: '测试数据已生成', description: `创建了 ${data.created_users} 个用户和 ${data.created_groups} 个拼团` });
      onSuccess();
    } catch (err: any) {
      toast({ title: '生成失败', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleSeed} disabled={loading} className="ml-auto text-xs gap-1">
      <Plus className="h-3.5 w-3.5" />
      {loading ? '生成中...' : '生成测试数据'}
    </Button>
  );
}

// ---- System Settings Panel ----
function SystemSettingsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [leavePoints, setLeavePoints] = useState<number | null>(null);
  const [kickPoints, setKickPoints] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Initialize local state from fetched settings
  const currentLeave = settings?.find(s => s.key === 'leave_credit_deduction');
  const currentKick = settings?.find(s => s.key === 'kick_credit_deduction');
  const displayLeave = leavePoints ?? Number(currentLeave?.value ?? 3);
  const displayKick = kickPoints ?? Number(currentKick?.value ?? 5);

  const handleSaveDeductions = async () => {
    setSaving(true);
    try {
      await supabase.from('system_settings').upsert({ key: 'leave_credit_deduction', value: (leavePoints ?? displayLeave) as any });
      await supabase.from('system_settings').upsert({ key: 'kick_credit_deduction', value: (kickPoints ?? displayKick) as any });
      toast({ title: '已保存扣分设置' });
      queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['setting'] });
    } catch (err: any) {
      toast({ title: '保存失败', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" /> 信用扣分设置
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">用户退出扣分（60分钟内）</Label>
              <Input type="number" min={0} max={100} value={displayLeave} onChange={e => setLeavePoints(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">房主踢人扣分（被踢用户）</Label>
              <Input type="number" min={0} max={100} value={displayKick} onChange={e => setKickPoints(Number(e.target.value))} />
            </div>
          </div>
          <Button size="sm" onClick={handleSaveDeductions} disabled={saving}>
            {saving ? '保存中...' : '保存扣分设置'}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> 认证设置
          </h3>
          <p className="text-sm text-muted-foreground">
            邮箱验证已改为按用户配置。请在「用户」标签页中编辑具体用户，切换「登录需验证邮箱」开关。
          </p>
        </CardContent>
      </Card>
      <BannedWordsManager />
    </div>
  );
}

// ---- Banned Words Manager ----
function BannedWordsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newWord, setNewWord] = useState('');

  const { data: words = [], isLoading } = useQuery({
    queryKey: ['admin-banned-words'],
    queryFn: async () => {
      const { data, error } = await supabase.from('banned_words').select('*').order('word');
      if (error) throw error;
      return data;
    },
  });

  const handleAdd = async () => {
    const w = newWord.trim();
    if (!w) return;
    const { error } = await supabase.from('banned_words').insert({ word: w });
    if (error) {
      toast({ title: error.message.includes('duplicate') ? '该违禁词已存在' : '添加失败', variant: 'destructive' });
    } else {
      toast({ title: `已添加：${w}` });
      setNewWord('');
      queryClient.invalidateQueries({ queryKey: ['admin-banned-words'] });
      // Invalidate client cache
      import('@/lib/banned-words').then(m => m.invalidateBannedWordsCache());
    }
  };

  const handleDelete = async (id: string, word: string) => {
    const { error } = await supabase.from('banned_words').delete().eq('id', id);
    if (error) toast({ title: '删除失败', variant: 'destructive' });
    else {
      toast({ title: `已删除：${word}` });
      queryClient.invalidateQueries({ queryKey: ['admin-banned-words'] });
      import('@/lib/banned-words').then(m => m.invalidateBannedWordsCache());
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" /> 违禁词管理
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="输入违禁词..."
            value={newWord}
            onChange={e => setNewWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={!newWord.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">加载中...</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {words.map(w => (
              <span key={w.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                {w.word}
                <button onClick={() => handleDelete(w.id, w.word)} className="hover:bg-destructive/20 rounded-full p-0.5">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
            {words.length === 0 && <p className="text-sm text-muted-foreground">暂无违禁词</p>}
          </div>
        )}
        <p className="text-xs text-muted-foreground">共 {words.length} 个违禁词。用户输入包含违禁词时将被拦截。</p>
      </CardContent>
    </Card>
  );
}

// ---- Batch Create Users Button ----
function BatchCreateUsersButton({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleBatchCreate = async () => {
    if (!confirm('确认批量创建测试用户 test001~test010？密码统一为 123456，无需邮箱验证。')) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('batch-create-users', {
        body: { prefix: 'test', count: 10, password: '123456' },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({
        title: '批量创建完成',
        description: `创建 ${data.created} 个，跳过 ${data.skipped} 个已存在用户`,
      });
      onSuccess();
    } catch (err: any) {
      toast({ title: '创建失败', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleBatchCreate} disabled={loading} className="text-xs gap-1">
      <UserPlus className="h-3.5 w-3.5" />
      {loading ? '创建中...' : '批量创建测试用户'}
    </Button>
  );
}
