import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layout/AppLayout';
import UserAvatar from '@/components/shared/UserAvatar';
import CreditBadge from '@/components/shared/CreditBadge';
import LoadingState from '@/components/shared/LoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useCreditHistory } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Camera, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { validateNoBannedWords } from '@/lib/banned-words';

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, isTest } = useAuth();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const { data: creditHistory = [], isLoading } = useCreditHistory(user?.id);
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (authLoading || isLoading) return <AppLayout><LoadingState /></AppLayout>;
  if (!user || !profile) {
    navigate('/login');
    return null;
  }

  if (isTest) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">编辑资料</h1>
          </div>
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">测试账号不允许修改个人信息</p>
              <Button variant="outline" onClick={() => navigate(-1)}>返回</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

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

  const save = async () => {
    if (nickname.trim().length < 2) {
      toast({ title: '昵称至少2个字符', variant: 'destructive' });
      return;
    }
    const bannedError = await validateNoBannedWords(nickname);
    if (bannedError) {
      toast({ title: bannedError, variant: 'destructive' });
      return;
    }
    try {
      await updateProfile.mutateAsync({ nickname });
      toast({ title: '保存成功' });
      navigate(-1);
    } catch (err: any) {
      toast({ title: '保存失败', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">编辑资料</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <UserAvatar
                  nickname={profile.nickname || ''}
                  avatar={profile.avatar_url || undefined}
                  size="lg"
                />
                <div className="absolute inset-0 rounded-full bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-background" />
                </div>
                {isUploading && (
                  <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
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
              <Input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={20} />
            </div>

            <Button onClick={save} className="w-full" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? '保存中...' : '保存'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              信用分详情
              <CreditBadge score={profile.credit_score} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {creditHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无信用分变动记录</p>
            ) : (
              creditHistory.map(ch => (
                <div key={ch.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span>{ch.reason}</span>
                    <span className="text-xs text-muted-foreground ml-2">{format(new Date(ch.created_at), 'MM-dd HH:mm')}</span>
                  </div>
                  <span className={ch.change > 0 ? 'text-[hsl(var(--success))] font-semibold' : 'text-destructive font-semibold'}>
                    {ch.change > 0 ? `+${ch.change}` : ch.change}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
