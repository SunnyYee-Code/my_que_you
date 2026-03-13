import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users, RefreshCw, UserPlus, Loader2, Crown, Navigation, ArrowUpDown } from 'lucide-react';
import CitySearchSelect from '@/components/layout/CitySearchSelect';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/shared/StatusBadge';
import CreditBadge from '@/components/shared/CreditBadge';
import UserAvatar from '@/components/shared/UserAvatar';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { useCity } from '@/contexts/CityContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupsByCity } from '@/hooks/useGroups';
import { useGroupJoinStatuses, useQuickJoin } from '@/hooks/useJoinGroup';
import { useGeolocation, getDistanceKm, formatDistance } from '@/hooks/useGeolocation';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type StatusFilter = 'all' | 'OPEN' | 'FULL' | 'IN_PROGRESS';
type SortMode = 'time_asc' | 'time_desc' | 'distance';

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'OPEN', label: '招募中' },
  { value: 'FULL', label: '已满员' },
  { value: 'IN_PROGRESS', label: '进行中' },
];

export default function IndexPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentCity } = useCity();
  const { user } = useAuth();
  const [distanceFilter, setDistanceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('time_asc');

  const { position, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  const { data: groups = [], isLoading, refetch, isFetching } = useGroupsByCity(currentCity.id);

  // Request location when user selects distance filter or distance sort
  useEffect(() => {
    if ((distanceFilter !== 'all' || sortMode === 'distance') && !position && !geoLoading) {
      requestLocation();
    }
  }, [distanceFilter, sortMode, position, geoLoading, requestLocation]);

  // Show error toast
  useEffect(() => {
    if (geoError && (distanceFilter !== 'all' || sortMode === 'distance')) {
      toast({ title: '定位失败', description: geoError, variant: 'destructive' });
    }
  }, [geoError]);

  // Compute distances
  const groupsWithDistance = useMemo(() => {
    return groups.map(g => {
      let distance: number | null = null;
      if (position && g.latitude && g.longitude) {
        distance = getDistanceKm(position.lat, position.lng, g.latitude, g.longitude);
      }
      return { ...g, distance };
    });
  }, [groups, position]);

  // Filter
  const filteredGroups = useMemo(() => {
    // Privacy filtering: OPEN visible to all; FULL/IN_PROGRESS only if user is member; hide COMPLETED/CANCELLED
    let result = groupsWithDistance.filter(g => {
      // Always hide ended/cancelled groups
      if (g.status === 'COMPLETED' || g.status === 'CANCELLED') return false;

      // FULL or IN_PROGRESS: only show if user is a member
      if (g.status === 'FULL' || g.status === 'IN_PROGRESS') {
        if (!user) return false;
        const isMember = g.members?.some((m: any) => m.user_id === user.id);
        const isHost = g.host_id === user.id;
        if (!isMember && !isHost) return false;
      }

      // Then apply status tab filter
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      return true;
    });

    // Distance filter
    if (distanceFilter !== 'all' && position) {
      const maxKm = parseFloat(distanceFilter);
      result = result.filter(g => g.distance !== null && g.distance <= maxKm);
    }

    // Sort
    result.sort((a, b) => {
      if (sortMode === 'distance') {
        // Groups without coords go to the end
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      }
      if (sortMode === 'time_asc') {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      }
      return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
    });

    return result;
  }, [groupsWithDistance, statusFilter, distanceFilter, sortMode, position]);

  const groupIds = filteredGroups.map(g => g.id);
  const { data: joinStatuses } = useGroupJoinStatuses(groupIds);
  const quickJoin = useQuickJoin();

  const handleJoinClick = (e: React.MouseEvent, groupId: string, hostId: string) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    quickJoin.mutate({ groupId, hostId });
  };

  const isHostFn = (group: typeof filteredGroups[0]) => user && group.host_id === user.id;

  const getJoinButtonState = (group: typeof filteredGroups[0]) => {
    if (!user) return { label: '加入', disabled: false, variant: 'default' as const };
    if (isHostFn(group)) return { label: '管理', disabled: false, variant: 'outline' as const };
    const status = joinStatuses?.[group.id];
    if (status?.isMember) return { label: '已加入', disabled: true, variant: 'secondary' as const };
    if (status?.isPending) return { label: '审核中', disabled: true, variant: 'outline' as const };
    if (group.status === 'FULL') return { label: '已满', disabled: true, variant: 'secondary' as const };
    if (group.status !== 'OPEN') return { label: '已关闭', disabled: true, variant: 'secondary' as const };
    return { label: '加入', disabled: false, variant: 'default' as const };
  };

  // COMPLETED/CANCELLED groups are now filtered out, so inactive is always false
  const isInactive = (_status: string) => false;

  const handleDistanceChange = (v: string) => {
    setDistanceFilter(v);
    if (v !== 'all' && !position) requestLocation();
  };

  const handleSortChange = (v: string) => {
    setSortMode(v as SortMode);
    if (v === 'distance' && !position) requestLocation();
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Mobile city selector */}
        <div className="md:hidden">
          <CitySearchSelect />
        </div>

        {/* Filters row 1: distance + sort + refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={distanceFilter} onValueChange={handleDistanceChange}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
              <SelectValue placeholder="距离" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">不限距离</SelectItem>
              <SelectItem value="1">1km内</SelectItem>
              <SelectItem value="3">3km内</SelectItem>
              <SelectItem value="5">5km内</SelectItem>
              <SelectItem value="10">10km内</SelectItem>
              <SelectItem value="20">20km内</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortMode} onValueChange={handleSortChange}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time_asc">最近开始</SelectItem>
              <SelectItem value="time_desc">最新发布</SelectItem>
              <SelectItem value="distance">距离最近</SelectItem>
            </SelectContent>
          </Select>

          {geoLoading && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> 定位中...
            </div>
          )}

          {!position && !geoLoading && distanceFilter === 'all' && sortMode !== 'distance' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 text-muted-foreground"
              onClick={requestLocation}
            >
              <Navigation className="h-3.5 w-3.5" /> 开启定位
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Filters row 2: status */}
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map(s => (
            <Button
              key={s.value}
              variant={statusFilter === s.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s.value)}
              className="text-xs h-7 px-2.5"
            >
              {s.label}
            </Button>
          ))}
        </div>

        {/* Group list */}
        {isLoading ? (
          <LoadingState />
        ) : filteredGroups.length === 0 ? (
          <EmptyState
            title="暂无拼团"
            description={
              distanceFilter !== 'all'
                ? `${distanceFilter}km内没有找到拼团，试试扩大范围`
                : `${currentCity.name}当前没有可加入的拼团`
            }
            actionLabel="创建拼团"
            onAction={() => navigate('/group/create')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredGroups.map(group => {
              const host = group.host;
              const btnState = getJoinButtonState(group);
              const inactive = isInactive(group.status);
              const hostFlag = isHostFn(group);
              const isInProgress = group.status === 'IN_PROGRESS';
              const isFull = !isInProgress && (group.needed_slots === 0 || group.status === 'FULL');

              return (
                <Card
                  key={group.id}
                  className={cn(
                    'cursor-pointer transition-all animate-fade-in relative overflow-hidden',
                    inactive ? 'opacity-60 hover:opacity-80' : 'hover:shadow-mahjong',
                    hostFlag && 'ring-1 ring-primary/30',
                    isFull && !inactive && 'opacity-80',
                    isInProgress && 'ring-1 ring-[hsl(var(--status-progress)/0.4)]'
                  )}
                  onClick={() => navigate(`/group/${group.id}`)}
                >
                  {hostFlag && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
                  )}

                  {isFull && !inactive && (
                    <div className="absolute top-3 -right-8 rotate-45 bg-[hsl(var(--status-full))] text-white text-[10px] font-bold px-8 py-0.5 shadow-sm z-10">
                      已满员
                    </div>
                  )}

                  {isInProgress && (
                    <div className="absolute top-3 -right-8 rotate-45 bg-[hsl(var(--status-progress))] text-white text-[10px] font-bold px-8 py-0.5 shadow-sm z-10">
                      进行中
                    </div>
                  )}

                  <CardContent className="p-4 space-y-3">
                    {/* Top: host info + slot indicator */}
                    <div className="flex items-start justify-between gap-3">
                      {host && (
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar nickname={host.nickname || ''} avatar={host.avatar_url || undefined} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm truncate">{host.nickname}</span>
                              {hostFlag && <Crown className="h-3.5 w-3.5 text-[hsl(var(--gold))] shrink-0" />}
                            </div>
                            <CreditBadge score={host.credit_score} />
                          </div>
                        </div>
                      )}
                      <div className="text-right shrink-0">
                        {isInProgress ? (
                          <>
                            <StatusBadge status="IN_PROGRESS" />
                            <div className="text-xs text-muted-foreground mt-1">{group.members?.length || (group.total_slots - group.needed_slots)}/{group.total_slots}人</div>
                          </>
                        ) : (
                          <>
                            <div className={cn(
                              'text-2xl font-black leading-none',
                              isFull ? 'text-[hsl(var(--status-full))]' : 'text-primary'
                            )}>
                              缺{group.needed_slots}人
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">总共{group.total_slots}人</div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className={cn('font-medium', inactive && 'line-through text-muted-foreground')}>
                        {format(new Date(group.start_time), 'M月d日 HH:mm', { locale: zhCN })}
                      </span>
                    </div>

                    {/* Location + distance */}
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{group.address}</span>
                      {group.distance !== null && (
                        <span className="shrink-0 text-xs text-primary font-medium ml-auto">
                          ({formatDistance(group.distance)})
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {(group.play_style || group.game_note) && (
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/50">
                        {group.play_style && (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-muted/70 text-foreground font-medium">
                            {group.play_style}
                          </span>
                        )}
                        {group.game_note?.split(/[，,、\s]+/).filter(Boolean).slice(0, 3).map((tag, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-muted/70 text-foreground font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action button */}
                    {!inactive && !hostFlag && (
                      <Button
                        size="sm"
                        variant={btnState.variant}
                        disabled={btnState.disabled || quickJoin.isPending}
                        className="w-full text-xs h-8 gap-1"
                        onClick={(e) => handleJoinClick(e, group.id, group.host_id)}
                      >
                        {quickJoin.isPending && quickJoin.variables?.groupId === group.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <UserPlus className="h-3 w-3" />
                        )}
                        {btnState.label}
                      </Button>
                    )}
                    {!inactive && hostFlag && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-8 gap-1 border-primary/30 text-primary"
                        onClick={(e) => { e.stopPropagation(); navigate(`/group/${group.id}`); }}
                      >
                        <Crown className="h-3 w-3" /> 管理我的拼团
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <p className="md:hidden text-center text-xs text-muted-foreground pt-4 pb-2">
          本平台仅供娱乐约局，禁止赌博
        </p>
      </div>
    </AppLayout>
  );
}
