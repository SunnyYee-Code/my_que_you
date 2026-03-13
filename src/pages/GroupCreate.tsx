import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/components/layout/AppLayout';
import AmapLocationPicker from '@/components/map/AmapLocationPicker';
import LoadingState from '@/components/shared/LoadingState';
import { useCity } from '@/contexts/CityContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateGroup } from '@/hooks/useGroups';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Calendar, MapPin, Users, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateNoBannedWords } from '@/lib/banned-words';
import { useQuery } from '@tanstack/react-query';

const PLAY_STYLES = [
  '血战到底', '血流成河', '北京麻将', '国标麻将',
  '重庆麻将', '广东麻将', '上海麻将', '杭州麻将',
  '长沙麻将', '武汉麻将',
];

export default function GroupCreatePage() {
  const navigate = useNavigate();
  const { currentCity } = useCity();
  const { user } = useAuth();
  const { toast } = useToast();
  const createGroup = useCreateGroup();

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

  if (!user) {
    navigate('/login');
    return null;
  }

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

  const canSubmit = startTime && endTime && address.trim() && (playStyle || customStyle.trim()) && !hasConflict && !dailyLimitExceeded && timeValid;

  const handleLocationSelect = (loc: { address: string; lat: number; lng: number }) => {
    setAddress(loc.address);
    setLatitude(loc.lat);
    setLongitude(loc.lng);
  };

  const finalPlayStyle = playStyle === '其他' ? customStyle.trim() : (playStyle || customStyle.trim());

  const handleSubmit = async () => {
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
                  <DialogHeader><DialogTitle>确认发布拼团</DialogTitle></DialogHeader>
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
