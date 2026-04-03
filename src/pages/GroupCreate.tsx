import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/components/layout/AppLayout';
import AmapLocationPicker from '@/components/map/AmapLocationPicker';
import LoadingState from '@/components/shared/LoadingState';
import RealNameRestrictionGuard from '@/components/shared/RealNameRestrictionGuard';
import { useCity } from '@/contexts/CityContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateGroup } from '@/hooks/useGroups';
import {
  useCreateFavoriteLocation,
  useDeleteFavoriteLocation,
  useFavoriteLocations,
  useMarkFavoriteLocationUsed,
  useUpdateFavoriteLocation,
} from '@/hooks/useFavoriteLocations';
import { useRealNameVerification } from '@/hooks/useRealNameVerification';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Calendar, MapPin, Users, FileText, AlertCircle, Clock3, Pencil, Trash2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateNoBannedWords } from '@/lib/banned-words';
import {
  MAX_FAVORITE_LOCATIONS,
  getFavoriteLocationReuseState,
  sortFavoriteLocations,
  type FavoriteLocationRecord,
} from '@/lib/favorite-locations';
import { useQuery } from '@tanstack/react-query';
import { REAL_NAME_SCENES } from '@/constants/realName';
import {
  createDefaultRealNameSnapshot,
  shouldBlockByRestrictionLevel,
  shouldShowRealNameGuard,
} from '@/lib/real-name-verification';

const PLAY_STYLES = [
  '血战到底', '血流成河', '北京麻将', '国标麻将',
  '重庆麻将', '广东麻将', '上海麻将', '杭州麻将',
  '长沙麻将', '武汉麻将',
];

type FavoriteLocationDraft = {
  city_id: string;
  city_name: string;
  address: string;
  latitude: number;
  longitude: number;
};

export default function GroupCreatePage() {
  const navigate = useNavigate();
  const { currentCity } = useCity();
  const { user } = useAuth();
  const { toast } = useToast();
  const createGroup = useCreateGroup();
  const { data: favoriteLocations = [], isLoading: favoriteLocationsLoading } = useFavoriteLocations();
  const createFavoriteLocation = useCreateFavoriteLocation();
  const updateFavoriteLocation = useUpdateFavoriteLocation();
  const deleteFavoriteLocation = useDeleteFavoriteLocation();
  const markFavoriteLocationUsed = useMarkFavoriteLocationUsed();
  const { data: realNameSnapshot, isLoading: realNameLoading, isError: realNameError } = useRealNameVerification();

  // Fetch user's time limits from profile
  const { data: timeLimits } = useQuery({
    queryKey: ['user-time-limits', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('max_start_hours, max_duration_hours')
        .eq('id', user!.id)
        .single();
      if (error) return { max_start_hours: 24, max_duration_hours: 24 };
      return data;
    },
  });

  const maxStartHours = timeLimits?.max_start_hours ?? 24;
  const maxDurationHours = timeLimits?.max_duration_hours ?? 24;

  const now = new Date();
  const maxStartTime = new Date(now.getTime() + maxStartHours * 60 * 60 * 1000);
  
  // Format for datetime-local min/max attributes
  const toLocalStr = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const minStartStr = toLocalStr(now);
  const maxStartStr = toLocalStr(maxStartTime);
  
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [totalSlots, setTotalSlots] = useState('4');
  const [neededSlots, setNeededSlots] = useState('3');
  const [playStyle, setPlayStyle] = useState('');
  const [customStyle, setCustomStyle] = useState('');
  const [gameNote, setGameNote] = useState('');
  const [favoriteDialogOpen, setFavoriteDialogOpen] = useState(false);
  const [favoriteName, setFavoriteName] = useState('');
  const [favoriteNote, setFavoriteNote] = useState('');
  const [editingFavorite, setEditingFavorite] = useState<FavoriteLocationRecord | null>(null);
  const [favoriteLocationDraft, setFavoriteLocationDraft] = useState<FavoriteLocationDraft | null>(null);

  // Check daily create limit
  const { data: dailyLimitCheck, isLoading: checkingDailyLimit } = useQuery({
    queryKey: ['daily-create-limit', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-group-limits', {
        body: { action: 'check_create' },
      });
      if (error) return { allowed: true, current: 0, limit: 5 };
      return data;
    },
  });

  // Check if user has active groups (hosting or participating in OPEN/FULL/IN_PROGRESS)
  const { data: activeCheck, isLoading: checkingActive } = useQuery({
    queryKey: ['active-group-check', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Check hosting active group
      const { data: hosting } = await supabase
        .from('groups')
        .select('id, address, status')
        .eq('host_id', user!.id)
        .in('status', ['OPEN', 'FULL', 'IN_PROGRESS'])
        .limit(1);

      // Check participating in active group
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user!.id);

      let participating: any[] = [];
      if (memberships && memberships.length > 0) {
        const { data } = await supabase
          .from('groups')
          .select('id, address, status, host_id')
          .in('id', memberships.map(m => m.group_id))
          .in('status', ['OPEN', 'FULL', 'IN_PROGRESS'])
          .neq('host_id', user!.id)
          .limit(1);
        participating = data || [];
      }

      return {
        hasHosting: (hosting && hosting.length > 0) ? hosting[0] : null,
        hasParticipating: participating.length > 0 ? participating[0] : null,
      };
    },
  });

  if (realNameLoading) return <AppLayout><LoadingState /></AppLayout>;

  if (!user) {
    navigate('/login');
    return null;
  }

  const effectiveRealNameSnapshot = (realNameSnapshot ?? (realNameError
    ? {
        ...createDefaultRealNameSnapshot(),
        restriction_level: 'blocked',
        restriction_scenes: [REAL_NAME_SCENES.GROUP_CREATE],
      }
    : null));
  const showRealNameGuard = effectiveRealNameSnapshot
    ? shouldShowRealNameGuard(effectiveRealNameSnapshot, REAL_NAME_SCENES.GROUP_CREATE)
    : false;
  const blockByRealName = effectiveRealNameSnapshot
    ? showRealNameGuard && shouldBlockByRestrictionLevel(effectiveRealNameSnapshot.restriction_level)
    : false;
  const hasConflict = activeCheck?.hasHosting || activeCheck?.hasParticipating;
  const dailyLimitExceeded = dailyLimitCheck && !dailyLimitCheck.allowed;
  // Time validation
  const startDate = startTime ? new Date(startTime) : null;
  const endDate = endTime ? new Date(endTime) : null;
  const timeValid = (() => {
    if (!startDate || !endDate) return false;
    const nowMs = Date.now();
    if (startDate.getTime() < nowMs) return false;
    if (startDate.getTime() > nowMs + maxStartHours * 60 * 60 * 1000) return false;
    if (endDate.getTime() <= startDate.getTime()) return false;
    if (endDate.getTime() > startDate.getTime() + maxDurationHours * 60 * 60 * 1000) return false;
    return true;
  })();

  const timeError = (() => {
    if (!startDate && !endDate) return '';
    if (startDate && startDate.getTime() < Date.now()) return '开始时间不能早于当前时间';
    if (startDate && startDate.getTime() > Date.now() + maxStartHours * 60 * 60 * 1000) return `开始时间不能超过${maxStartHours}小时后`;
    if (startDate && endDate && endDate.getTime() <= startDate.getTime()) return '结束时间必须晚于开始时间';
    if (startDate && endDate && endDate.getTime() > startDate.getTime() + maxDurationHours * 60 * 60 * 1000) return `持续时间不能超过${maxDurationHours}小时`;
    return '';
  })();

  const canSubmit = startTime && endTime && address.trim() && (playStyle || customStyle.trim()) && !hasConflict && !dailyLimitExceeded && !blockByRealName && timeValid;
  const sortedFavoriteLocations = useMemo(
    () => sortFavoriteLocations(favoriteLocations, currentCity.id),
    [currentCity.id, favoriteLocations],
  );
  const currentLocationReadyForFavorite = address.trim() && typeof latitude === 'number' && typeof longitude === 'number';
  const activeFavorite = sortedFavoriteLocations.find((item) =>
    item.address === address.trim()
      && item.city_id === currentCity.id
      && item.latitude === latitude
      && item.longitude === longitude,
  );
  const favoriteLimitReached = !editingFavorite && favoriteLocations.length >= MAX_FAVORITE_LOCATIONS;

  const handleLocationSelect = (loc: { address: string; lat: number; lng: number }) => {
    setAddress(loc.address);
    setLatitude(loc.lat);
    setLongitude(loc.lng);
  };

  const currentSelectedLocationDraft = currentLocationReadyForFavorite ? {
    city_id: currentCity.id,
    city_name: currentCity.name,
    address: address.trim(),
    latitude: latitude!,
    longitude: longitude!,
  } : null;

  const resetFavoriteForm = () => {
    setFavoriteDialogOpen(false);
    setFavoriteName('');
    setFavoriteNote('');
    setEditingFavorite(null);
    setFavoriteLocationDraft(null);
  };

  const openCreateFavoriteDialog = () => {
    setEditingFavorite(null);
    setFavoriteName('');
    setFavoriteNote('');
    setFavoriteLocationDraft(currentSelectedLocationDraft);
    setFavoriteDialogOpen(true);
  };

  const openEditFavoriteDialog = (favorite: FavoriteLocationRecord) => {
    setEditingFavorite(favorite);
    setFavoriteName(favorite.name);
    setFavoriteNote(favorite.note ?? '');
    setFavoriteLocationDraft({
      city_id: favorite.city_id,
      city_name: favorite.city_name,
      address: favorite.address,
      latitude: favorite.latitude,
      longitude: favorite.longitude,
    });
    setFavoriteDialogOpen(true);
  };

  const applyFavoriteLocation = async (favorite: FavoriteLocationRecord) => {
    const reuseState = getFavoriteLocationReuseState(favorite, currentCity.id);
    if (!reuseState.canReuse) {
      toast({ title: '当前地点不可直接复用', description: reuseState.reason, variant: 'destructive' });
      return;
    }

    handleLocationSelect({
      address: favorite.address,
      lat: favorite.latitude!,
      lng: favorite.longitude!,
    });

    await markFavoriteLocationUsed.mutateAsync(favorite.id);
  };

  const handleSaveFavorite = async () => {
    if (!user) {
      toast({ title: '请先登录后再收藏地点', variant: 'destructive' });
      return;
    }

    if (!favoriteLocationDraft) {
      toast({ title: '请先选定有效地点', description: '缺少地址或坐标时无法收藏。', variant: 'destructive' });
      return;
    }

    const trimmedName = favoriteName.trim();
    const trimmedNote = favoriteNote.trim();

    if (!trimmedName) {
      toast({ title: '请填写地点名称', variant: 'destructive' });
      return;
    }

    try {
      if (editingFavorite) {
        await updateFavoriteLocation.mutateAsync({
          id: editingFavorite.id,
          city_id: favoriteLocationDraft.city_id,
          city_name: favoriteLocationDraft.city_name,
          name: trimmedName,
          address: favoriteLocationDraft.address,
          latitude: favoriteLocationDraft.latitude,
          longitude: favoriteLocationDraft.longitude,
          note: trimmedNote,
        });
        toast({ title: '常用地点已更新' });
      } else {
        await createFavoriteLocation.mutateAsync({
          city_id: favoriteLocationDraft.city_id,
          city_name: favoriteLocationDraft.city_name,
          name: trimmedName,
          address: favoriteLocationDraft.address,
          latitude: favoriteLocationDraft.latitude,
          longitude: favoriteLocationDraft.longitude,
          note: trimmedNote,
        });
        toast({ title: '已加入常用地点' });
      }
      resetFavoriteForm();
    } catch (error: any) {
      toast({ title: editingFavorite ? '更新失败' : '收藏失败', description: error.message || '请稍后重试', variant: 'destructive' });
    }
  };

  const handleDeleteFavorite = async (favorite: FavoriteLocationRecord) => {
    try {
      await deleteFavoriteLocation.mutateAsync(favorite.id);
      toast({ title: '常用地点已删除' });
    } catch (error: any) {
      toast({ title: '删除失败', description: error.message || '请稍后重试', variant: 'destructive' });
    }
  };

  const finalPlayStyle = playStyle === '其他' ? customStyle.trim() : (playStyle || customStyle.trim());

  const handleSubmit = async () => {
    if (blockByRealName) {
      toast({ title: '请先完成实名认证', description: '当前场景需先完成实名认证后继续。', variant: 'destructive' });
      return;
    }
    if (hasConflict) {
      toast({ title: '你还有未结束的拼团', variant: 'destructive' });
      return;
    }
    if (dailyLimitExceeded) {
      toast({ title: dailyLimitCheck?.message || '今日创建团数已达上限', variant: 'destructive' });
      return;
    }
    // Check banned words in address, play style, and game note
    for (const [label, text] of [['地址', address], ['玩法', finalPlayStyle], ['备注', gameNote]] as const) {
      const err = await validateNoBannedWords(text);
      if (err) {
        toast({ title: `${label}${err}`, variant: 'destructive' });
        return;
      }
    }
    try {
      await createGroup.mutateAsync({
        city_id: currentCity.id,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        address,
        latitude,
        longitude,
        total_slots: parseInt(totalSlots),
        needed_slots: parseInt(neededSlots),
        play_style: finalPlayStyle,
        game_note: gameNote || undefined,
      });
      // Record the creation
      await supabase.functions.invoke('check-group-limits', {
        body: { action: 'record_create' },
      });
      if (activeFavorite) {
        await markFavoriteLocationUsed.mutateAsync(activeFavorite.id);
      }
      toast({ title: '拼团创建成功！', description: '等待其他玩家加入' });
      navigate('/');
    } catch (err: any) {
      toast({ title: '创建失败', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">创建拼团</h1>
        </div>

        {/* Daily limit warning */}
        {effectiveRealNameSnapshot && showRealNameGuard && (
          <RealNameRestrictionGuard snapshot={effectiveRealNameSnapshot} scene={REAL_NAME_SCENES.GROUP_CREATE} />
        )}

        {!checkingDailyLimit && dailyLimitExceeded && (
          <Card className="border-[hsl(var(--status-full))/0.4] bg-[hsl(var(--status-full)/0.06)]">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[hsl(var(--status-full))] shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p>{dailyLimitCheck?.message || '今日创建团数已达上限'}</p>
                <p className="text-muted-foreground">今日已创建 {dailyLimitCheck?.current}/{dailyLimitCheck?.limit} 个团</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active group warning */}
        {!checkingActive && hasConflict && (
          <Card className="border-[hsl(var(--status-full))/0.4] bg-[hsl(var(--status-full)/0.06)]">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[hsl(var(--status-full))] shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                {activeCheck?.hasHosting && (
                  <p>
                    你已开团：<span className="font-medium">{activeCheck.hasHosting.address}</span>
                    <Button variant="link" size="sm" className="h-auto p-0 ml-1" onClick={() => navigate(`/group/${activeCheck.hasHosting.id}`)}>
                      去查看
                    </Button>
                  </p>
                )}
                {activeCheck?.hasParticipating && (
                  <p>
                    你正在参与：<span className="font-medium">{activeCheck.hasParticipating.address}</span>
                    <Button variant="link" size="sm" className="h-auto p-0 ml-1" onClick={() => navigate(`/group/${activeCheck.hasParticipating.id}`)}>
                      去查看
                    </Button>
                  </p>
                )}
                <p className="text-muted-foreground">请先完成或退出当前拼团后再创建新拼团</p>
              </div>
            </CardContent>
          </Card>
        )}

        {(checkingActive || checkingDailyLimit) && <LoadingState />}

        <Card>
          <CardContent className="p-4 space-y-5">
            {/* Time */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> 时间</label>
              <p className="text-xs text-muted-foreground">开始时间须在{maxStartHours}小时内，持续时间不超过{maxDurationHours}小时</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">开始时间</span>
                  <Input type="datetime-local" value={startTime} onChange={e => { setStartTime(e.target.value); if (endTime && new Date(e.target.value) >= new Date(endTime)) setEndTime(''); }} min={minStartStr} max={maxStartStr} />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">结束时间</span>
                  <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} min={startTime || minStartStr} max={startTime ? toLocalStr(new Date(new Date(startTime).getTime() + maxDurationHours * 60 * 60 * 1000)) : undefined} />
                </div>
              </div>
              {timeError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{timeError}</p>}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4" /> 地点</label>
              <p className="text-xs text-muted-foreground">当前城市：{currentCity.name}</p>
              <AmapLocationPicker
                onSelect={handleLocationSelect}
                initialAddress={address}
                initialLat={latitude}
                initialLng={longitude}
              />
              {address && (
                <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{address}</span>
                </div>
              )}

              <Dialog open={favoriteDialogOpen} onOpenChange={(open) => {
                setFavoriteDialogOpen(open);
                if (!open) resetFavoriteForm();
              }}>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={activeFavorite ? 'secondary' : 'outline'}
                    onClick={activeFavorite ? () => openEditFavoriteDialog(activeFavorite) : openCreateFavoriteDialog}
                    disabled={!currentLocationReadyForFavorite || favoriteLimitReached}
                  >
                    <Star className="h-4 w-4" />
                    {activeFavorite ? '编辑已收藏地点' : '收藏当前地点'}
                  </Button>
                  {favoriteLimitReached && (
                    <p className="text-xs text-muted-foreground">已达到 {MAX_FAVORITE_LOCATIONS} 个收藏上限，请先删除旧地点。</p>
                  )}
                  {!currentLocationReadyForFavorite && (
                    <p className="text-xs text-muted-foreground">选择完整地址和坐标后，才可加入常用地点。</p>
                  )}
                </div>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingFavorite ? '编辑常用地点' : '收藏地点'}</DialogTitle>
                    <DialogDescription>
                      保存地点名称、地址和备注，下次创建拼团时可以一键复用。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="favorite-location-name">地点名称</Label>
                      <Input
                        id="favorite-location-name"
                        aria-label="地点名称"
                        value={favoriteName}
                        onChange={(event) => setFavoriteName(event.target.value.slice(0, 20))}
                        placeholder="例如：公司楼下牌馆"
                        maxLength={20}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="favorite-location-note">备注</Label>
                      <Textarea
                        id="favorite-location-note"
                        aria-label="备注"
                        value={favoriteNote}
                        onChange={(event) => setFavoriteNote(event.target.value.slice(0, 50))}
                        placeholder="例如：停车方便、近地铁"
                        maxLength={50}
                      />
                    </div>
                    {currentSelectedLocationDraft && (
                      <div className="rounded-lg bg-muted/40 p-3 space-y-2">
                        <p className="text-xs text-muted-foreground">当前建局页选点</p>
                        <p className="text-sm">{currentSelectedLocationDraft.address}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFavoriteLocationDraft(currentSelectedLocationDraft)}
                        >
                          使用当前选点覆盖地址
                        </Button>
                      </div>
                    )}
                    <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                      <p className="text-xs text-muted-foreground">{editingFavorite ? '收藏中的地点信息' : '即将收藏的地点信息'}</p>
                      <p className="font-medium text-foreground">{favoriteLocationDraft?.address || '请先在地图中选点'}</p>
                      <p>{favoriteLocationDraft?.city_name || currentCity.name}</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" onClick={handleSaveFavorite} disabled={createFavoriteLocation.isPending || updateFavoriteLocation.isPending}>
                      {editingFavorite ? '更新地点' : '保存地点'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">常用地点</p>
                    <p className="text-xs text-muted-foreground">
                      当前城市优先，最近使用会排在更前面。最多收藏 {MAX_FAVORITE_LOCATIONS} 个地点。
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{favoriteLocations.length}/{MAX_FAVORITE_LOCATIONS}</span>
                </div>

                {favoriteLocationsLoading ? (
                  <p className="text-sm text-muted-foreground">常用地点加载中...</p>
                ) : sortedFavoriteLocations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">还没有收藏地点，选好地址后可直接加入常用地点。</p>
                ) : (
                  <div className="space-y-2">
                    {sortedFavoriteLocations.map((favorite) => {
                      const reuseState = getFavoriteLocationReuseState(favorite, currentCity.id);
                      return (
                        <div key={favorite.id} className="rounded-lg border bg-background p-3 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium">{favorite.name}</p>
                                {favorite.city_id !== currentCity.id && (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{favorite.city_name}</span>
                                )}
                                {favorite.last_used_at && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Clock3 className="h-3 w-3" />
                                    最近使用
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground break-words">{favorite.address}</p>
                              {favorite.note && <p className="text-xs text-muted-foreground">{favorite.note}</p>}
                              {!reuseState.canReuse && <p className="text-xs text-destructive">{reuseState.reason}</p>}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button type="button" variant="outline" size="icon" aria-label={`编辑 ${favorite.name}`} onClick={() => openEditFavoriteDialog(favorite)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="outline" size="icon" aria-label={`删除 ${favorite.name}`} onClick={() => void handleDeleteFavorite(favorite)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant={reuseState.canReuse ? 'secondary' : 'outline'}
                            className="w-full sm:w-auto"
                            aria-label={reuseState.canReuse ? `快捷填入 ${favorite.name}` : `切换城市后复用 ${favorite.name}`}
                            onClick={() => void applyFavoriteLocation(favorite)}
                            disabled={!reuseState.canReuse}
                          >
                            {reuseState.canReuse ? '快捷填入' : '切换城市后复用'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Slots */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> 人数</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">总人数</span>
                  <Select value={totalSlots} onValueChange={v => {
                    setTotalSlots(v);
                    if (parseInt(neededSlots) >= parseInt(v)) setNeededSlots(String(parseInt(v) - 1));
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4].map(n => <SelectItem key={n} value={String(n)}>{n}人</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">缺人数</span>
                  <Select value={neededSlots} onValueChange={setNeededSlots}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: parseInt(totalSlots) - 1 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={String(n)}>{n}人</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Play style cards */}
            <div className="space-y-3">
              <label className="text-sm font-medium">🀄 玩法</label>
              <div className="flex flex-wrap gap-2">
                {PLAY_STYLES.map(style => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => { setPlayStyle(style); setCustomStyle(''); }}
                    className={cn(
                      'px-3.5 py-2 rounded-xl text-sm border-2 transition-all font-medium',
                      playStyle === style
                        ? 'bg-primary/12 border-primary text-primary shadow-sm'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                    )}
                  >
                    {style}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPlayStyle('其他')}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-sm border-2 transition-all font-medium',
                    playStyle === '其他'
                      ? 'bg-primary/12 border-primary text-primary shadow-sm'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  )}
                >
                  其他
                </button>
              </div>
              {playStyle === '其他' && (
                <Input
                  placeholder="请输入玩法名称"
                  value={customStyle}
                  onChange={e => setCustomStyle(e.target.value)}
                  maxLength={20}
                  className="mt-2"
                  autoFocus
                />
              )}
            </div>

            {/* Game note */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> 备注</label>
              <Textarea
                placeholder="写点什么吸引牌友..."
                value={gameNote}
                onChange={e => setGameNote(e.target.value.slice(0, 100))}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground text-right">{gameNote.length}/100</p>
            </div>

            {/* Submit */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full" disabled={!canSubmit || checkingActive || checkingDailyLimit}>
                  {dailyLimitExceeded ? '今日创建团数已达上限' : hasConflict ? '你有未结束的拼团' : '预览并发布'}
                </Button>
              </DialogTrigger>
              {canSubmit && (
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>确认发布拼团</DialogTitle>
                    <DialogDescription>确认地点、时间和人数信息后再发布，发布成功后会保留原有手动填写链路。</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 text-sm">
                    <p>📍 {currentCity.name} - {address}</p>
                    <p>🕐 {startTime} ~ {endTime}</p>
                    <p>👥 总{totalSlots}人 / 缺{neededSlots}人</p>
                    <p>🀄 {finalPlayStyle}</p>
                    {gameNote && <p>📝 {gameNote}</p>}
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSubmit} disabled={createGroup.isPending}>
                      {createGroup.isPending ? '发布中...' : '确认发布'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              )}
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
