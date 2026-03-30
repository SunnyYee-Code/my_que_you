import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/components/layout/AppLayout';
import UserAvatar from '@/components/shared/UserAvatar';
import CreditBadge from '@/components/shared/CreditBadge';
import LoadingState from '@/components/shared/LoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useCreditHistory } from '@/hooks/useProfile';
import { useCancelRealNameVerification, useRealNameVerification, useSubmitRealNameVerification } from '@/hooks/useRealNameVerification';
import { useAccountDeletionStatus, useApplyAccountDeletion, useCancelAccountDeletion } from '@/hooks/useAccountDeletion';
import { ACCOUNT_DELETION_STATUS, DEFAULT_ACCOUNT_DELETION_SNAPSHOT } from '@/constants/accountDeletion';
import { useToast } from '@/hooks/use-toast';
import { buildRealNameViewModel, getRealNameStatusActions, REAL_NAME_COPY } from '@/constants/realName';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, AlertTriangle, Shield, Camera, User, Phone, Calendar, Lock } from 'lucide-react';
import { format } from 'date-fns';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile, loading: authLoading, isTest } = useAuth();
  const { toast } = useToast();
  const { data: creditHistory = [], isLoading } = useCreditHistory(user?.id);
  const { data: accountDeletionStatus = DEFAULT_ACCOUNT_DELETION_SNAPSHOT, isLoading: deletionStatusLoading } = useAccountDeletionStatus();
  const applyAccountDeletion = useApplyAccountDeletion();
  const cancelAccountDeletion = useCancelAccountDeletion();
  const updateProfile = useUpdateProfile();
  const { data: realNameSnapshot, isLoading: realNameLoading } = useRealNameVerification();
  const submitRealNameVerification = useSubmitRealNameVerification();
  const cancelRealNameVerification = useCancelRealNameVerification();
  const [appealReason, setAppealReason] = useState('');
  const [realName, setRealName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [isUploading, setIsUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (authLoading || isLoading || deletionStatusLoading || realNameLoading) return <AppLayout><LoadingState /></AppLayout>;

  if (!user || !profile) {
    navigate('/login');
    return null;
  }


  const realNameViewModel = useMemo(() => buildRealNameViewModel(realNameSnapshot), [realNameSnapshot]);
  const realNameActions = useMemo(() => getRealNameStatusActions(realNameSnapshot), [realNameSnapshot]);

  const handleSubmitRealName = async () => {
    if (!realName.trim() || !idNumber.trim()) {
      toast({ title: '请补全实名认证信息', description: '真实姓名和身份证号均为必填项', variant: 'destructive' });
      return;
    }
    if (!consentChecked) {
      toast({ title: '请先勾选认证授权', description: '勾选授权后才能提交实名认证', variant: 'destructive' });
      return;
    }

    try {
      await submitRealNameVerification.mutateAsync({
        real_name: realName.trim(),
        id_number: idNumber.trim(),
        consent_checked: consentChecked,
      });
      toast({ title: REAL_NAME_COPY.submitSuccessTitle, description: REAL_NAME_COPY.submitSuccessDescription });
    } catch (error: any) {
      toast({ title: '实名认证提交失败', description: error.message || '请稍后重试', variant: 'destructive' });
    }
  };

  const handleCancelRealName = async () => {
    try {
      await cancelRealNameVerification.mutateAsync();
      toast({ title: REAL_NAME_COPY.cancelSuccessTitle, description: REAL_NAME_COPY.cancelSuccessDescription });
    } catch (error: any) {
      toast({ title: '撤销失败', description: error.message || '请稍后重试', variant: 'destructive' });
    }
  };

  const deletionStatusMeta = useMemo(() => {
    switch (accountDeletionStatus.applyStatus) {
      case ACCOUNT_DELETION_STATUS.COOLING_OFF:
        return {
          title: '账号注销冷静期中',
          description: accountDeletionStatus.coolingOffExpireAt
            ? `冷静期截止：${format(new Date(accountDeletionStatus.coolingOffExpireAt), 'yyyy-MM-dd HH:mm')}`
            : '系统将在冷静期结束后继续处理注销。',
          tone: 'warning',
        } as const;
      case ACCOUNT_DELETION_STATUS.PROCESSING:
        return {
          title: '账号注销处理中',
          description: '系统正在处理账号数据，请留意站内通知。',
          tone: 'info',
        } as const;
      case ACCOUNT_DELETION_STATUS.COMPLETED:
        return {
          title: '账号已完成注销',
          description: accountDeletionStatus.resultReason || '账号已进入注销完成状态。',
          tone: 'success',
        } as const;
      case ACCOUNT_DELETION_STATUS.CANCELLED:
        return {
          title: '已撤销注销申请',
          description: accountDeletionStatus.resultReason || '你可以继续正常使用账号。',
          tone: 'info',
        } as const;
      case ACCOUNT_DELETION_STATUS.REJECTED:
        return {
          title: '注销申请未通过',
          description: accountDeletionStatus.resultReason || '请根据提示处理后重新申请。',
          tone: 'danger',
        } as const;
      default:
        return {
          title: '账号状态正常',
          description: '如确认不再使用，可发起账号注销申请。',
          tone: 'default',
        } as const;
    }
  }, [accountDeletionStatus]);

  const shouldShowDeletionApplyEntry = ![
    ACCOUNT_DELETION_STATUS.COOLING_OFF,
    ACCOUNT_DELETION_STATUS.PROCESSING,
    ACCOUNT_DELETION_STATUS.COMPLETED,
  ].includes(accountDeletionStatus.applyStatus);

  useEffect(() => {
    if (accountDeletionStatus.applyStatus !== ACCOUNT_DELETION_STATUS.COMPLETED) return;

    void (async () => {
      toast({
        title: '账号已注销',
        description: '当前登录态已失效，请使用其他账号重新登录。',
      });
      await signOut();
      navigate('/login');
    })();
  }, [accountDeletionStatus.applyStatus, navigate, signOut, toast]);

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

    if (!accountDeletionStatus.canOperate) {
      toast({
        title: '当前无法发起注销',
        description: accountDeletionStatus.forbiddenReason || '请稍后重试',
        variant: 'destructive',
      });
      return;
    }

    try {
      await applyAccountDeletion.mutateAsync();
      toast({
        title: '注销申请已提交',
        description: '账号已进入冷静期，请在到期前确认是否撤销。',
      });
    } catch (err: any) {
      toast({
        title: '注销申请提交失败',
        description: err?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleCancelDeactivate = async () => {
    try {
      await cancelAccountDeletion.mutateAsync();
      toast({
        title: '已撤销注销申请',
        description: '你的账号状态已恢复正常。',
      });
    } catch (err: any) {
      toast({
        title: '撤销注销失败',
        description: err?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
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


        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> {REAL_NAME_COPY.sectionTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{REAL_NAME_COPY.statusLabel}</span>
                <span className="text-sm font-medium">{realNameViewModel.badgeText}</span>
              </div>
              <p className="text-sm text-muted-foreground">{realNameViewModel.description}</p>
              {realNameViewModel.lastSubmittedAt && (
                <p className="text-xs text-muted-foreground">{REAL_NAME_COPY.submittedAtLabel}：{format(new Date(realNameViewModel.lastSubmittedAt), 'yyyy-MM-dd HH:mm')}</p>
              )}
              {realNameViewModel.verifiedAt && (
                <p className="text-xs text-muted-foreground">{REAL_NAME_COPY.verifiedAtLabel}：{format(new Date(realNameViewModel.verifiedAt), 'yyyy-MM-dd HH:mm')}</p>
              )}
              {realNameViewModel.rejectReasonText && (
                <p className="text-xs text-destructive">{REAL_NAME_COPY.rejectReasonLabel}：{realNameViewModel.rejectReasonText}</p>
              )}
            </div>

            {realNameActions.showSubmitForm && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{REAL_NAME_COPY.formDescription}</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{REAL_NAME_COPY.realNameLabel}</label>
                  <Input value={realName} onChange={(e) => setRealName(e.target.value)} placeholder={REAL_NAME_COPY.realNamePlaceholder} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{REAL_NAME_COPY.idNumberLabel}</label>
                  <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder={REAL_NAME_COPY.idNumberPlaceholder} />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={consentChecked} onCheckedChange={(checked) => setConsentChecked(Boolean(checked))} />
                  <span>{REAL_NAME_COPY.consentLabel}</span>
                </label>
                <Button
                  type="button"
                  onClick={handleSubmitRealName}
                  disabled={submitRealNameVerification.isPending || (!realNameViewModel.canSubmit && !realNameViewModel.canResubmit)}
                >
                  {realNameActions.primaryLabel}
                </Button>
              </div>
            )}

            {!realNameActions.showSubmitForm && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled>
                  {realNameActions.primaryLabel}
                </Button>
                {realNameViewModel.canCancel && realNameActions.allowCancel && (
                  <Button type="button" variant="outline" onClick={handleCancelRealName} disabled={cancelRealNameVerification.isPending}>
                    撤销申请
                  </Button>
                )}
              </div>
            )}

            {realNameViewModel.status === 'rejected' && realNameViewModel.canResubmit && realNameActions.allowResubmit && (
              <p className="text-xs text-muted-foreground">请根据驳回原因修正信息后重新提交。</p>
            )}
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
          <CardContent className="space-y-4">
            <div
              className="rounded-lg border p-4"
              data-tone={deletionStatusMeta.tone}
            >
              <p className="text-sm font-medium">{deletionStatusMeta.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{deletionStatusMeta.description}</p>
              {accountDeletionStatus.forbiddenReason && (
                <p className="mt-2 text-sm text-destructive">{accountDeletionStatus.forbiddenReason}</p>
              )}
            </div>

            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">注销前须知</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>提交申请后将进入冷静期，冷静期内可撤销申请。</li>
                <li>冷静期结束后，系统会根据后端状态继续处理账号注销。</li>
                <li>如后端返回限制原因，请先处理相关问题后再尝试。</li>
              </ul>
            </div>

            {accountDeletionStatus.applyStatus === ACCOUNT_DELETION_STATUS.COOLING_OFF ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCancelDeactivate}
                disabled={cancelAccountDeletion.isPending}
              >
                {cancelAccountDeletion.isPending ? '撤销中...' : '撤销注销申请'}
              </Button>
            ) : shouldShowDeletionApplyEntry ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={!accountDeletionStatus.canOperate || applyAccountDeletion.isPending}
                  >
                    {applyAccountDeletion.isPending ? '提交中...' : '注销账号'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>确认注销账号？</DialogTitle></DialogHeader>
                  <p className="text-sm text-muted-foreground">注销后系统将按后端状态流转处理账号与数据。如有进行中的拼团，请先完成或取消。</p>
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      onClick={handleDeactivate}
                      disabled={!accountDeletionStatus.canOperate || applyAccountDeletion.isPending}
                    >
                      {applyAccountDeletion.isPending ? '提交中...' : '确认注销'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
          </CardContent>
        </Card>
        )}
      </div>
    </AppLayout>
  );
}
