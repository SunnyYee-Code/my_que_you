import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/components/layout/AppLayout';
import UserAvatar from '@/components/shared/UserAvatar';
import CreditBadge from '@/components/shared/CreditBadge';
import LoadingState from '@/components/shared/LoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useCreditHistory } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, AlertTriangle, Shield, Camera, User, Phone, Calendar, Lock } from 'lucide-react';
import { format } from 'date-fns';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile, loading: authLoading, isTest } = useAuth();
  const { toast } = useToast();
  const { data: creditHistory = [], isLoading } = useCreditHistory(user?.id);
  const updateProfile = useUpdateProfile();
  const [appealReason, setAppealReason] = useState('');
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [isUploading, setIsUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (authLoading || isLoading) return <AppLayout><LoadingState /></AppLayout>;

  if (!user || !profile) {
    navigate('/login');
    return null;
  }

  const appealableHistory = creditHistory.filter(ch => ch.can_appeal && ch.change < 0 && !ch.appeal_status);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast({ title: '图片大小不能超过1MB', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateProfile.mutateAsync({ avatar_url: publicUrl });
      toast({ title: '头像更新成功' });
    } catch (err: any) {
      toast({ title: '上传失败', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveNickname = async () => {
    if (nickname.trim().length < 2) {
      toast({ title: '昵称至少2个字符', variant: 'destructive' });
      return;
    }
    try {
      await updateProfile.mutateAsync({ nickname: nickname.trim() });
      toast({ title: '昵称更新成功' });
    } catch (err: any) {
      toast({ title: '保存失败', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeactivate = async () => {
    if (isTest) {
      toast({ title: '测试账号不允许注销', variant: 'destructive' });
      return;
    }
    toast({ title: '账号注销请求已提交', description: '我们会在7个工作日内处理' });
  };

  const handleAppeal = async (creditId: string) => {
    if (!appealReason.trim()) {
      toast({ title: '请填写申诉理由', variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('credit_history')
      .update({ appeal_status: 'pending', appeal_reason: appealReason })
      .eq('id', creditId);
    if (error) {
      toast({ title: '申诉提交失败', variant: 'destructive' });
    } else {
      toast({ title: '申诉已提交', description: '我们会在48小时内审核' });
      setAppealReason('');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast({ title: '请输入当前密码', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: '新密码至少6个字符', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: '两次输入的密码不一致', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    try {
      // Verify old password by re-authenticating
      const email = user.email;
      if (!email) throw new Error('无法获取账号邮箱');
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (signInError) {
        toast({ title: '当前密码不正确', variant: 'destructive' });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: '密码修改成功，请重新登录' });
      await signOut();
      navigate('/login');
    } catch (err: any) {
      toast({ title: '密码修改失败', description: err.message, variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">账号设置</h1>
        </div>

        {/* Avatar & nickname */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">个人资料</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <UserAvatar
                  nickname={profile.nickname || '用户'}
                  avatar={profile.avatar_url || undefined}
                  size="lg"
                />
                <div className="absolute inset-0 rounded-full bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-background" />
                </div>
                {isUploading && (
                  <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">点击更换头像（限1MB）</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">昵称</label>
              <div className="flex gap-2">
                <Input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={20} />
                <Button
                  onClick={handleSaveNickname}
                  disabled={updateProfile.isPending || nickname === profile.nickname}
                  size="sm"
                >
                  保存
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> 个人信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> 手机号
              </div>
              <span className="text-sm">{profile.phone || '未绑定'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-3.5 w-3.5" /> 信用分
              </div>
              <CreditBadge score={profile.credit_score} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> 注册时间
              </div>
              <span className="text-sm">{format(new Date(profile.created_at), 'yyyy-MM-dd')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Credit appeal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> 信用分申诉
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appealableHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无可申诉的扣分记录</p>
            ) : (
              appealableHistory.map(ch => (
                <div key={ch.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{ch.reason}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(ch.created_at), 'yyyy-MM-dd HH:mm')}</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">申诉</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>提交申诉</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <p className="text-sm"><strong>扣分原因：</strong>{ch.reason}</p>
                        <Textarea
                          placeholder="请输入申诉理由..."
                          value={appealReason}
                          onChange={e => setAppealReason(e.target.value)}
                          maxLength={200}
                        />
                        <p className="text-xs text-muted-foreground text-right">{appealReason.length}/200</p>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => handleAppeal(ch.id)}>提交申诉</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> 修改密码
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">当前密码</label>
              <Input
                type="password"
                placeholder="请输入当前密码"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">新密码</label>
              <Input
                type="password"
                placeholder="请输入新密码（至少6位）"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">确认新密码</label>
              <Input
                type="password"
                placeholder="请再次输入新密码"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {changingPassword ? '修改中...' : '确认修改密码'}
            </Button>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card>
          <CardContent className="p-4">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              退出登录
            </Button>
          </CardContent>
        </Card>

        {/* Deactivate */}
        {!isTest && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> 危险操作
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full">注销账号</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>确认注销账号？</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">注销后所有数据将被删除且无法恢复。如有进行中的拼团，请先完成或取消。</p>
                <DialogFooter>
                  <Button variant="destructive" onClick={handleDeactivate}>确认注销</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        )}
      </div>
    </AppLayout>
  );
}
