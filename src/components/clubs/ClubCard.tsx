/**
 * T15 4.3.4 俱乐部 — 俱乐部卡片组件
 */
import { Users, Lock, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/shared/UserAvatar';
import type { Club } from '@/lib/clubs';
import { canManageClub, isActiveMember } from '@/lib/clubs';

interface ClubCardProps {
  club: Club;
  onJoin?: (club: Club) => void;
  onLeave?: (club: Club) => void;
  onClick?: (club: Club) => void;
  isJoining?: boolean;
  isLeaving?: boolean;
}

export default function ClubCard({
  club,
  onJoin,
  onLeave,
  onClick,
  isJoining,
  isLeaving,
}: ClubCardProps) {
  const isMember = isActiveMember(club.myStatus);
  const isManager = canManageClub(club.myRole);
  const isPending = club.myStatus === 'pending';

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMember && !isManager && onLeave) {
      onLeave(club);
    } else if (!isMember && !isPending && onJoin) {
      onJoin(club);
    }
  };

  const actionLabel = () => {
    if (isManager) return null; // 管理员不显示退出按钮
    if (isMember) return '退出';
    if (isPending) return '审核中';
    return club.isPublic ? '加入' : '申请';
  };

  const actionVariant = (): 'default' | 'outline' | 'secondary' => {
    if (isMember) return 'outline';
    if (isPending) return 'secondary';
    return 'default';
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md animate-fade-in"
      onClick={() => onClick?.(club)}
    >
      <CardContent className="p-4 space-y-3">
        {/* 俱乐部头部信息 */}
        <div className="flex items-start gap-3">
          <UserAvatar
            nickname={club.name}
            avatar={club.avatarUrl || undefined}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm truncate">{club.name}</span>
              {!club.isPublic && (
                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              {club.isPublic && (
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{club.memberCount} 名成员</span>
            </div>
          </div>

          {/* 我的角色标签 */}
          {club.myRole === 'owner' && (
            <Badge variant="default" className="text-[10px] shrink-0">创始人</Badge>
          )}
          {club.myRole === 'admin' && (
            <Badge variant="secondary" className="text-[10px] shrink-0">管理员</Badge>
          )}
        </div>

        {/* 简介 */}
        {club.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{club.description}</p>
        )}

        {/* 操作按钮 */}
        {actionLabel() && (
          <Button
            size="sm"
            variant={actionVariant()}
            disabled={isPending || isJoining || isLeaving}
            className="w-full h-8 text-xs"
            onClick={handleAction}
          >
            {actionLabel()}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
