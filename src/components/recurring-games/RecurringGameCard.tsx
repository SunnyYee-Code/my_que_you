/**
 * T15 4.3.5 长期局 — 卡片组件
 */
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatGameSchedule,
  hasSlot,
  isActiveMember,
  isOrganizer,
  MEMBER_ROLE_LABELS,
  STATUS_LABELS,
  type RecurringGame,
} from '@/lib/recurring-games';

interface RecurringGameCardProps {
  game: RecurringGame;
  onJoin?: (game: RecurringGame) => void;
  onLeave?: (game: RecurringGame) => void;
  onClick?: (game: RecurringGame) => void;
  isJoining?: boolean;
  isLeaving?: boolean;
}

export default function RecurringGameCard({
  game,
  onJoin,
  onLeave,
  onClick,
  isJoining,
  isLeaving,
}: RecurringGameCardProps) {
  const isMember = isActiveMember(game.myStatus);
  const organizer = isOrganizer(game.myRole);
  const pending = game.myStatus === 'pending';
  const onLeave_ = game.myStatus === 'on_leave';

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(game)}
    >
      <CardContent className="p-4 space-y-3">
        {/* 标题行 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{game.title}</h3>
            {game.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{game.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {game.status !== 'active' && (
              <Badge variant="secondary" className="text-xs">
                {STATUS_LABELS[game.status]}
              </Badge>
            )}
            {organizer && (
              <Badge variant="outline" className="text-xs text-primary border-primary">
                {MEMBER_ROLE_LABELS['organizer']}
              </Badge>
            )}
            {!organizer && isMember && (
              <Badge variant="outline" className="text-xs">
                {MEMBER_ROLE_LABELS[game.myRole!]}
              </Badge>
            )}
            {pending && (
              <Badge variant="secondary" className="text-xs">待确认</Badge>
            )}
            {onLeave_ && (
              <Badge variant="secondary" className="text-xs text-yellow-600">请假中</Badge>
            )}
          </div>
        </div>

        {/* 信息行 */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatGameSchedule(game.weekday, game.startTime)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {game.memberCount}/{game.maxMembers} 人
          </span>
          {game.locationName && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate max-w-[120px]">{game.locationName}</span>
            </span>
          )}
        </div>

        {/* 操作按钮 */}
        {game.status === 'active' && (
          <div onClick={e => e.stopPropagation()} className="pt-1">
            {!game.myRole && !pending && (
              <Button
                size="sm"
                className="w-full"
                disabled={!hasSlot(game) || isJoining}
                onClick={() => onJoin?.(game)}
              >
                {isJoining ? '申请中…' : hasSlot(game) ? '申请加入' : '名额已满'}
              </Button>
            )}
            {pending && (
              <Button size="sm" variant="secondary" className="w-full" disabled>
                等待组织者确认
              </Button>
            )}
            {(isMember || onLeave_) && !organizer && (
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-muted-foreground"
                disabled={isLeaving}
                onClick={() => onLeave?.(game)}
              >
                {isLeaving ? '退出中…' : '退出长期局'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
