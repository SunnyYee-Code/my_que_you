import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { validateNoBannedWords } from '@/lib/banned-words';
import { Camera, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If user already completed onboarding, redirect
  if (profile?.onboarding_completed) {
    navigate('/community', { replace: true });
    return null;
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
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
      setAvatarUrl(publicUrl);
      toast({ title: '头像上传成功' });
    } catch (err: any) {
      toast({ title: '上传失败', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleComplete = async () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      toast({ title: '用户名至少2个字符', variant: 'destructive' });
      return;
    }
    if (trimmed.length > 20) {
      toast({ title: '用户名最多20个字符', variant: 'destructive' });
      return;
    }

    // Check for banned words
    const bannedError = await validateNoBannedWords(trimmed);
    if (bannedError) {
      toast({ title: bannedError, variant: 'destructive' });
      return;
    }

    // Check username uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', trimmed)
      .neq('id', user.id)
      .limit(1);
    if (existing && existing.length > 0) {
      toast({ title: '该用户名已被使用，请换一个', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const updates: Record<string, any> = {
        nickname: trimmed,
        onboarding_completed: true,
      };
      if (avatarUrl) {
        updates.avatar_url = avatarUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: '设置完成，欢迎加入雀友聚！' });
      navigate('/community', { replace: true });
    } catch (err: any) {
      toast({ title: '保存失败', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-mahjong">
        <CardHeader className="text-center space-y-2">
          <div className="text-5xl mb-2">🀄</div>
          <CardTitle className="font-display text-2xl">欢迎加入雀友聚</CardTitle>
          <CardDescription>设置你的头像和用户名，开始约局吧！</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <UserAvatar
                nickname={nickname || '新'}
                avatar={avatarUrl || undefined}
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
            <p className="text-xs text-muted-foreground">点击上传头像（可选，限1MB）</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          {/* Username input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">用户名 *</label>
            <Input
              placeholder="请输入用户名（2-20个字符）"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">用户名将在社区中展示，请确保合规</p>
          </div>

          {/* Submit button */}
          <Button
            onClick={handleComplete}
            className="w-full"
            disabled={nickname.trim().length < 2 || isSaving || isUploading}
          >
            {isSaving ? '保存中...' : '确定，进入社区'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
