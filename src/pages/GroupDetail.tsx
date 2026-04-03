import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/shared/StatusBadge';
import CreditBadge from '@/components/shared/CreditBadge';
import UserAvatar from '@/components/shared/UserAvatar';
import LoadingState from '@/components/shared/LoadingState';
import RealNameRestrictionGuard from '@/components/shared/RealNameRestrictionGuard';
import ReportDialog from '@/components/shared/ReportDialog';
import { useGroupDetail } from '@/hooks/useGroups';
import { useRealNameVerification } from '@/hooks/useRealNameVerification';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MapPin, Clock, Users, Navigation, MessageCircle, AlertTriangle, Crown, ChevronRight, HelpCircle, UserMinus, Share2, Copy, Download } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import AddFriendButton from '@/components/friends/AddFriendButton';
import InviteFriendsDialog from '@/components/friends/InviteFriendsDialog';
import { REAL_NAME_SCENES } from '@/constants/realName';
import { getGroupEmergencyFillMeta } from '@/lib/group-emergency-fill';
import {
  buildGroupSharePosterModel,
  createGroupSharePosterBlob,
  createGroupSharePosterFile,
} from '@/lib/group-share-poster';
import {
  buildNotificationDeliveryFields,
  buildNotificationDeliveryLogFields,
  buildNotificationReachPlan,
} from '@/lib/notification-reach';
import {
  createDefaultRealNameSnapshot,
  shouldBlockByRestrictionLevel,
  shouldShowRealNameGuard,
} from '@/lib/real-name-verification';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function throwIfSupabaseError(result: { error: unknown } | null | undefined, fallback: string) {
  if (result?.error) {
    throw new Error(getErrorMessage(result.error, fallback));
  }
}

function copyTextFallback(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return copied;
}

export default function GroupDetailPage() {
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [kickTargetId, setKickTargetId] = useState<string | null>(null);
  const [kickReason, setKickReason] = useState('');
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: group, isLoading } = useGroupDetail(id);
  const { data: realNameSnapshot, isLoading: realNameLoading, isError: realNameError } = useRealNameVerification();

  const { data: myApp } = useQuery({
    queryKey: ['my-application', id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('join_requests')
        .select('*')
        .eq('group_id', id!)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Fetch system settings for credit deductions
  const { data: leaveDeduction } = useQuery({
    queryKey: ['setting', 'leave_credit_deduction'],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'leave_credit_deduction').single();
      return Number(data?.value ?? 3);
    },
  });
  const { data: kickDeduction } = useQuery({
    queryKey: ['setting', 'kick_credit_deduction'],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'kick_credit_deduction').single();
      return Number(data?.value ?? 5);
    },
  });
  const leavePoints = leaveDeduction ?? 3;
  const kickPoints = kickDeduction ?? 5;

  if (isLoading) return <AppLayout><LoadingState /></AppLayout>;
  if (!group) return <AppLayout><div className="text-center py-20">拼团不存在</div></AppLayout>;

  const host = group.host;
  const members = group.members || [];
  const isHost = group.host_id === user?.id;
  const isMember = members.some(m => m.user_id === user?.id);
  const startDate = new Date(group.start_time);
  const endDate = new Date(group.end_time);
  const isUpcoming = startDate > new Date();
  const emptySlots = group.needed_slots;
  const emergencyFillMeta = getGroupEmergencyFillMeta(group);
  const effectiveRealNameSnapshot = user
    ? (realNameSnapshot ?? (realNameError
        ? {
            ...createDefaultRealNameSnapshot(),
            restriction_level: 'blocked',
            restriction_scenes: [REAL_NAME_SCENES.GROUP_JOIN],
          }
        : null))
    : null;
  const showJoinRealNameGuard = user && effectiveRealNameSnapshot
    ? shouldShowRealNameGuard(effectiveRealNameSnapshot, REAL_NAME_SCENES.GROUP_JOIN)
    : false;
  const blockJoinByRealName = showJoinRealNameGuard && effectiveRealNameSnapshot
    ? shouldBlockByRestrictionLevel(effectiveRealNameSnapshot.restriction_level)
    : false;

  const handleApply = async () => {
    if (!user) { navigate('/login'); return; }
    if (blockJoinByRealName) {
      toast({ title: '请先完成实名认证', description: '当前场景需先完成实名认证后继续。', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('join_requests').insert({
        group_id: group.id, user_id: user.id, host_id: group.host_id,
      });
      if (error) throw error;
      toast({ title: '申请已提交', description: '等待房主审核' });
      queryClient.invalidateQueries({ queryKey: ['my-application'] });
    } catch (err: any) {
      toast({ title: '申请失败', description: err.message, variant: 'destructive' });
    }
  };

  const isWithin60Min = startDate.getTime() - Date.now() < 60 * 60 * 1000;
  const sharePosterModel = buildGroupSharePosterModel({
    id: group.id,
    address: group.address,
    start_time: group.start_time,
    end_time: group.end_time,
    total_slots: group.total_slots,
    needed_slots: group.needed_slots,
    play_style: group.play_style,
    game_note: group.game_note,
    hostNickname: host?.nickname,
  }, window.location.origin);

  const handleCopyShareText = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sharePosterModel.shareText);
      } else {
        const copied = copyTextFallback(sharePosterModel.shareText);

        if (!copied) {
          throw new Error('当前环境不支持复制');
        }
      }
      toast({ title: '分享文案已复制', description: '可以直接发给牌友或群聊。' });
    } catch (error) {
      toast({ title: '复制失败', description: getErrorMessage(error, '请稍后重试'), variant: 'destructive' });
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share !== 'function') {
      toast({ title: '当前浏览器不支持系统分享', description: '你可以先复制文案或保存海报。', variant: 'destructive' });
      return;
    }

    try {
      const file = await createGroupSharePosterFile(sharePosterModel);
      const fileSharePayload = {
        title: sharePosterModel.title,
        text: sharePosterModel.shareText,
        files: [file],
      };
      const canShareFiles = typeof navigator.canShare === 'function'
        ? navigator.canShare(fileSharePayload)
        : false;

      if (canShareFiles) {
        await navigator.share(fileSharePayload);
        toast({ title: '分享已发起', description: '已拉起系统分享面板。' });
        return;
      }

      await navigator.share({
        title: sharePosterModel.title,
        text: sharePosterModel.shareText,
        url: sharePosterModel.shareLink,
      });
      toast({ title: '已降级为链接分享', description: '当前环境不支持文件分享，已改为发送文案与链接。' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      toast({ title: '系统分享失败', description: getErrorMessage(error, '请稍后重试'), variant: 'destructive' });
    }
  };

  const handleDownloadPoster = async () => {
    try {
      const blob = await createGroupSharePosterBlob(sharePosterModel);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = sharePosterModel.fileName;
      link.click();
      URL.revokeObjectURL(objectUrl);
      toast({ title: '海报已开始下载', description: '可保存后转发给牌友。' });
    } catch (error) {
      toast({ title: '保存海报失败', description: getErrorMessage(error, '请稍后重试'), variant: 'destructive' });
    }
  };

  const handleLeave = async () => {
    try {
      // Record exit
      const exitInsertResult = await supabase.from('group_member_exits').insert({
        group_id: group.id,
        user_id: user!.id,
        exit_type: 'left',
        reason: isWithin60Min ? leaveReason : null,
        credit_change: isWithin60Min ? -leavePoints : 0,
      });
      throwIfSupabaseError(exitInsertResult, '退出记录保存失败');

      const deleteMemberResult = await supabase.from('group_members').delete().eq('group_id', group.id).eq('user_id', user!.id);
      throwIfSupabaseError(deleteMemberResult, '成员移除失败');
      const newNeeded = group.total_slots - (members.length - 1);
      const nextEmergencyFillMeta = getGroupEmergencyFillMeta({
        ...group,
        status: 'OPEN',
        needed_slots: newNeeded,
      });
      const groupUpdateResult = await supabase.from('groups').update({ needed_slots: newNeeded, status: 'OPEN' }).eq('id', group.id);
      throwIfSupabaseError(groupUpdateResult, '场次状态更新失败');

      const warnings: Array<{ title: string; description: string }> = [];

      if (isWithin60Min) {
        // Deduct credit
        const profileUpdateResult = await supabase
          .from('profiles')
          .update({ credit_score: Math.max(0, (members.find(m => m.user_id === user!.id)?.profiles?.credit_score || 100) - leavePoints) })
          .eq('id', user!.id);
        if (profileUpdateResult.error) {
          warnings.push({
            title: '信用分更新失败',
            description: '退出已生效，但信用分更新未成功，请稍后复查。',
          });
        }

        const creditHistoryResult = await supabase.from('credit_history').insert({
          user_id: user!.id, change: -leavePoints, reason: '开局前60分钟内退出拼团', group_id: group.id, can_appeal: true,
        });
        if (creditHistoryResult.error) {
          warnings.push({
            title: '信用记录写入失败',
            description: '退出已生效，但信用变更记录未成功写入，请联系管理员补记。',
          });
        }
        toast({ title: '已退出拼团' });
        toast({ title: '⚠️ 信用分已扣除', description: `开局前60分钟内退出，信用分-${leavePoints}`, variant: 'destructive' });
      } else {
        toast({ title: '已退出拼团' });
      }

      // Notify host
      const leaverProfile = members.find(m => m.user_id === user!.id)?.profiles;
      const leaverName = leaverProfile?.nickname || '用户';
      const emergencyFillSuffix = nextEmergencyFillMeta.isEmergencyFill
        ? ` 当前已触发紧急补位（${nextEmergencyFillMeta.countdownText}）。`
        : '';
      const hostNotificationPlan = buildNotificationReachPlan({
        eventKey: nextEmergencyFillMeta.isEmergencyFill ? 'emergency_fill' : 'membership_change',
        audienceRole: 'host',
      });
      const notificationResult = await supabase.from('notifications').insert({
        user_id: group.host_id,
        type: 'group_cancelled' as any,
        title: '成员退出拼团',
        content: `${leaverName} 已退出你的拼团${isWithin60Min && leaveReason ? '，理由：' + leaveReason : ''}。${emergencyFillSuffix}`.trim(),
        link_to: `/group/${group.id}`,
        ...buildNotificationDeliveryFields({
          plan: hostNotificationPlan,
          metadata: {
            group_id: group.id,
            emergency_fill: nextEmergencyFillMeta.isEmergencyFill,
          },
        }),
      });
      if (notificationResult.error) {
        warnings.push({
          title: '补位通知发送失败',
          description: '退出已生效，但房主通知未发送成功，请稍后重试提醒。',
        });
      } else {
        await supabase.from('notification_delivery_logs').insert({
          user_id: group.host_id,
          ...buildNotificationDeliveryLogFields({
            plan: hostNotificationPlan,
            status: 'sent',
            notificationType: 'group_cancelled',
            metadata: {
              group_id: group.id,
              emergency_fill: nextEmergencyFillMeta.isEmergencyFill,
            },
          }),
        } as any);
      }
      if (nextEmergencyFillMeta.isEmergencyFill) {
        toast({
          title: '已触发紧急补位',
          description: `${nextEmergencyFillMeta.description}，该场次会在列表优先曝光。`,
        });
      }

      warnings.forEach((warning) => {
        toast({ ...warning, variant: 'destructive' });
      });

      setLeaveDialogOpen(false);
      setLeaveReason('');
      queryClient.invalidateQueries({ queryKey: ['group'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: ['group'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: '退出失败', description: getErrorMessage(err, '退出链路执行失败'), variant: 'destructive' });
    }
  };

  const handleKick = async () => {
    if (!kickTargetId || !kickReason.trim()) {
      toast({ title: '请输入踢人理由', variant: 'destructive' });
      return;
    }
    try {
      // Record exit
      const exitInsertResult = await supabase.from('group_member_exits').insert({
        group_id: group.id,
        user_id: kickTargetId,
        exit_type: 'kicked',
        reason: kickReason,
        kicked_by: user!.id,
        credit_change: -kickPoints,
      });
      throwIfSupabaseError(exitInsertResult, '移除记录保存失败');

      // Remove member
      const deleteMemberResult = await supabase.from('group_members').delete().eq('group_id', group.id).eq('user_id', kickTargetId);
      throwIfSupabaseError(deleteMemberResult, '成员移除失败');
      const newNeeded = group.total_slots - (members.length - 1);
      const nextEmergencyFillMeta = getGroupEmergencyFillMeta({
        ...group,
        status: 'OPEN',
        needed_slots: newNeeded,
      });
      const groupUpdateResult = await supabase.from('groups').update({ needed_slots: newNeeded, status: 'OPEN' }).eq('id', group.id);
      throwIfSupabaseError(groupUpdateResult, '场次状态更新失败');

      // Deduct credit from kicked user
      const kickedProfile = members.find(m => m.user_id === kickTargetId)?.profiles;
      const warnings: Array<{ title: string; description: string }> = [];
      const profileUpdateResult = await supabase
        .from('profiles')
        .update({ credit_score: Math.max(0, (kickedProfile?.credit_score || 100) - kickPoints) })
        .eq('id', kickTargetId);
      if (profileUpdateResult.error) {
        warnings.push({
          title: '信用分更新失败',
          description: '成员已移除，但信用分更新未成功，请稍后复查。',
        });
      }

      const creditHistoryResult = await supabase.from('credit_history').insert({
        user_id: kickTargetId, change: -kickPoints, reason: '被房主踢出拼团：' + kickReason, group_id: group.id, can_appeal: true,
      });
      if (creditHistoryResult.error) {
        warnings.push({
          title: '信用记录写入失败',
          description: '成员已移除，但信用变更记录未成功写入，请联系管理员补记。',
        });
      }

      // Send notification
      const kickedMemberNotificationPlan = buildNotificationReachPlan({
        eventKey: 'membership_change',
        audienceRole: 'member',
      });
      const notificationResult = await supabase.from('notifications').insert({
        user_id: kickTargetId,
        type: 'group_cancelled' as any,
        title: '被移出拼团',
        content: `房主将你移出了拼团，理由：${kickReason}`,
        link_to: `/my-groups`,
        ...buildNotificationDeliveryFields({
          plan: kickedMemberNotificationPlan,
          metadata: {
            group_id: group.id,
            kicked_by: user!.id,
          },
        }),
      });
      if (notificationResult.error) {
        warnings.push({
          title: '补位通知发送失败',
          description: '成员已移除，但通知未发送成功，请稍后重试提醒。',
        });
      } else {
        await supabase.from('notification_delivery_logs').insert({
          user_id: kickTargetId,
          ...buildNotificationDeliveryLogFields({
            plan: kickedMemberNotificationPlan,
            status: 'sent',
            notificationType: 'group_cancelled',
            metadata: {
              group_id: group.id,
              kicked_by: user!.id,
            },
          }),
        } as any);
      }

      toast({ title: '已移除成员' });
      if (nextEmergencyFillMeta.isEmergencyFill) {
        toast({
          title: '已触发紧急补位',
          description: `${nextEmergencyFillMeta.description}，该场次会在列表优先曝光。`,
        });
      }
      warnings.forEach((warning) => {
        toast({ ...warning, variant: 'destructive' });
      });
      setKickDialogOpen(false);
      setKickTargetId(null);
      setKickReason('');
      queryClient.invalidateQueries({ queryKey: ['group'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: ['group'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: '操作失败', description: getErrorMessage(err, '移除链路执行失败'), variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    try {
      await supabase.from('groups').update({ status: 'CANCELLED' }).eq('id', group.id);
      toast({ title: '拼团已取消' });
      queryClient.invalidateQueries({ queryKey: ['group'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    } catch (err: any) {
      toast({ title: '取消失败', variant: 'destructive' });
    }
  };

  const handleNavigate = () => {
    if (group.latitude && group.longitude) {
      window.open(`https://uri.amap.com/marker?position=${group.longitude},${group.latitude}&name=${encodeURIComponent(group.address)}`, '_blank');
    } else {
      window.open(`https://uri.amap.com/search?keyword=${encodeURIComponent(group.address)}`, '_blank');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">拼团详情</h1>
          </div>
          <StatusBadge status={group.status} />
        </div>

        {/* Host card */}
        {host && (
          <Card>
            <CardContent className="p-4">
              <Link to={`/profile/${host.id}`} className="flex items-center gap-3">
                <UserAvatar nickname={host.nickname || ''} avatar={host.avatar_url || undefined} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">{host.nickname}</span>
                    <Crown className="h-4 w-4 text-[hsl(var(--gold))]" />
                    <span className="text-sm text-muted-foreground">房主</span>
                  </div>
                  <CreditBadge score={host.credit_score} className="mt-1" />
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                  查看主页 <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Info card */}
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {/* Location */}
            <div className="flex items-start gap-3 p-4">
              <MapPin className="h-5 w-5 text-[hsl(var(--status-open))] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px]">{group.address}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleNavigate}>
                <Navigation className="h-3.5 w-3.5" /> 导航
              </Button>
            </div>

            {/* Time */}
            <div className="flex items-start gap-3 p-4">
              <Clock className="h-5 w-5 text-[hsl(var(--status-progress))] mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-[15px]">
                  {format(startDate, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                </p>
                <p className="text-sm text-muted-foreground">
                  至 {startDate.toDateString() === endDate.toDateString()
                    ? format(endDate, 'HH:mm')
                    : format(endDate, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                  {isUpcoming && (
                    <span className="ml-2 text-[hsl(var(--status-open))]">
                      · {formatDistanceToNow(startDate, { locale: zhCN, addSuffix: true })}开始
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Slots */}
            <div className="flex items-center gap-3 p-4">
              <Users className="h-5 w-5 text-[hsl(var(--status-full))] shrink-0" />
              <div className="inline-flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-full">
                <Users className="h-4 w-4" />
                <span className="font-semibold text-sm">{members.length}/{group.total_slots}人</span>
                <span className="text-muted-foreground">·</span>
                {emptySlots > 0 ? (
                  <span className="text-sm text-[hsl(var(--status-open))] font-semibold">缺{emptySlots}人</span>
                ) : (
                  <span className="text-sm text-[hsl(var(--status-full))] font-semibold">已满员</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {emergencyFillMeta.isEmergencyFill && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="destructive" className="h-6 px-2.5 text-[11px] tracking-[0.08em]">
                    {emergencyFillMeta.badgeText}
                  </Badge>
                  <p className="font-semibold text-destructive">紧急补位中</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {emergencyFillMeta.description}，当前场次已进入优先曝光。
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Play style / game note */}
        {(group.game_note || group.play_style) && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">玩法备注</p>
              {group.game_note && <p className="text-[15px]">{group.game_note}</p>}
              {group.play_style && (
                <span className="inline-block text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                  {group.play_style}
                </span>
              )}
            </CardContent>
          </Card>
        )}

        {/* Members list */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-base">已入团成员 ({members.length}/{group.total_slots})</h3>
            <div className="space-y-1">
              {members.map(m => {
                if (!m.profiles) return null;
                const isThisHost = m.user_id === group.host_id;
                return (
                  <div key={m.user_id} className="flex items-center gap-3 py-2.5 rounded-lg hover:bg-muted/40 px-2 transition-colors">
                    <Link to={`/profile/${m.user_id}`}>
                      <UserAvatar nickname={m.profiles.nickname || ''} avatar={m.profiles.avatar_url || undefined} size="md" />
                    </Link>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Link to={`/profile/${m.user_id}`} className="font-medium text-sm truncate hover:underline">
                        {m.profiles.nickname}
                      </Link>
                      {isThisHost && <Crown className="h-3.5 w-3.5 text-[hsl(var(--gold))] shrink-0" />}
                    </div>
                    <CreditBadge score={m.profiles.credit_score} />
                    {m.user_id !== user?.id && (
                      <div className="flex items-center gap-0.5">
                        {isHost && !isThisHost && (group.status === 'OPEN' || group.status === 'FULL') && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                            setKickTargetId(m.user_id);
                            setKickReason('');
                            setKickDialogOpen(true);
                          }}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                        <AddFriendButton targetUserId={m.user_id} groupId={group.id} size="icon" />
                        <ReportDialog reportedId={m.user_id} groupId={group.id} />
                        <Link to={`/profile/${m.user_id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-3 py-2.5 px-2">
                  <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <HelpCircle className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                  <span className="text-sm text-muted-foreground/50">等待加入...</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2 pb-4">
          {(isMember || isHost) && group.status === 'OPEN' && (
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Share2 className="h-4 w-4" /> 分享海报
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                  <DialogTitle>拼团分享海报</DialogTitle>
                  <DialogDescription>
                    生成可保存、可转发的拼团海报，方便你快速邀请牌友补位。
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
                    <img src={sharePosterModel.svgDataUrl} alt="拼团分享海报预览" className="w-full" />
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{sharePosterModel.title}</p>
                    <p className="mt-1">{sharePosterModel.summary}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {sharePosterModel.facts.map((fact) => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:justify-between">
                  <Button type="button" variant="outline" className="gap-2" onClick={handleCopyShareText}>
                    <Copy className="h-4 w-4" /> 复制文案
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" onClick={handleNativeShare}>
                    <Share2 className="h-4 w-4" /> 系统分享
                  </Button>
                  <Button type="button" className="gap-2" onClick={handleDownloadPoster}>
                    <Download className="h-4 w-4" /> 保存海报
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {!isMember && !isHost && group.status === 'OPEN' && user && !realNameLoading && effectiveRealNameSnapshot && showJoinRealNameGuard && (
            <RealNameRestrictionGuard snapshot={effectiveRealNameSnapshot} scene={REAL_NAME_SCENES.GROUP_JOIN} />
          )}

          {(group.status === 'OPEN' || group.status === 'FULL') && (isMember || isHost) && (
            <>
              <Button variant="outline" className="w-full gap-2" onClick={() => navigate(`/group/${group.id}/chat`)}>
                <MessageCircle className="h-4 w-4" /> 进入聊天室
              </Button>
              {group.status === 'OPEN' && (
                <InviteFriendsDialog
                  groupId={group.id}
                  groupAddress={group.address}
                  groupStartTime={group.start_time}
                  totalSlots={group.total_slots}
                  neededSlots={group.needed_slots}
                  existingMemberIds={members.map(m => m.user_id)}
                  isHost={isHost}
                />
              )}
            </>
          )}

          {isHost && group.status === 'OPEN' && (
            <>
              <Button className="w-full" onClick={() => navigate('/host/requests')}>管理申请</Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full">取消拼团</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>确认取消拼团？</DialogTitle></DialogHeader>
                  <p className="text-sm text-muted-foreground">取消后所有成员将收到通知。</p>
                  <DialogFooter>
                    <Button variant="destructive" onClick={handleCancel}>确认取消</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          {!isMember && !isHost && group.status === 'OPEN' && user && (
            myApp?.status === 'PENDING' ? (
              <div className="text-center py-3 text-sm">
                申请状态：<span className="font-semibold text-[hsl(var(--status-full))]">等待审核</span>
              </div>
            ) : (
              <Button className="w-full text-base h-11" onClick={handleApply} disabled={blockJoinByRealName}>申请加入</Button>
            )
          )}

          {!user && group.status === 'OPEN' && (
            <Button className="w-full text-base h-11" onClick={() => navigate('/login')}>登录后申请加入</Button>
          )}

          {isMember && !isHost && (group.status === 'OPEN' || group.status === 'FULL') && (
            <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full text-destructive">退出拼团</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>确认退出？</DialogTitle></DialogHeader>
                {isWithin60Min ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold text-destructive">距开局不到60分钟！</p>
                        <p className="text-muted-foreground mt-1">此时退出将<strong className="text-destructive">扣除{leavePoints}分信用分</strong>，请慎重考虑。</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">退出理由 <span className="text-destructive">*</span></p>
                      <Textarea placeholder="请说明退出原因..." value={leaveReason} onChange={e => setLeaveReason(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">退出后需要重新申请加入。开始前60分钟内退出将扣除信用分。</p>
                )}
                <DialogFooter>
                  <Button variant="destructive" onClick={handleLeave} disabled={isWithin60Min && !leaveReason.trim()}>
                    {isWithin60Min ? `仍然退出（扣${leavePoints}分）` : '确认退出'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Kick dialog */}
          <Dialog open={kickDialogOpen} onOpenChange={setKickDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>移除成员</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">被移除的成员将收到通知，并扣除{kickPoints}分信用分。</p>
                <div>
                  <p className="text-sm font-medium mb-1">踢人理由 <span className="text-destructive">*</span></p>
                  <Textarea placeholder="请说明移除原因..." value={kickReason} onChange={e => setKickReason(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="destructive" onClick={handleKick} disabled={!kickReason.trim()}>确认移除</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {group.status === 'COMPLETED' && isMember && (
            <Button className="w-full text-base h-11" onClick={() => navigate(`/group/${group.id}/review`)}>去评价</Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
