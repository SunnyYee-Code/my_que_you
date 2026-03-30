import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Clock, ChevronRight, Shield, Navigation, Users, Star, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/shared/UserAvatar';
import CreditBadge from '@/components/shared/CreditBadge';
import LoadingState from '@/components/shared/LoadingState';
import { useCity } from '@/contexts/CityContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupsByCity, useMyGroups } from '@/hooks/useGroups';
import { useGeolocation, getDistanceKm, formatDistance } from '@/hooks/useGeolocation';
import { format, isToday, isTomorrow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useEffect, useMemo } from 'react';
import HomeNavBar from '@/components/home/HomeNavBar';
import HomeFooter from '@/components/home/HomeFooter';
import { inferPreferredPlayStyles, sortGroupsForDisplay } from '@/lib/group-recommendation';

function formatSmartTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return `今天 ${format(d, 'HH:mm')}`;
  if (isTomorrow(d)) return `明天 ${format(d, 'HH:mm')}`;
  return format(d, 'M月d日 HH:mm', { locale: zhCN });
}

export default function HomePage() {
  const navigate = useNavigate();
  const { currentCity } = useCity();
  const { user } = useAuth();
  const { position, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  const { data: groups = [], isLoading } = useGroupsByCity(currentCity.id);
  const { data: myGroups } = useMyGroups();

  useEffect(() => {
    if (groups.length > 0 && !position && !geoLoading && !geoError) {
      requestLocation();
    }
  }, [groups.length, position, geoLoading, geoError, requestLocation]);

  const previewGroups = useMemo(() => {
    const active = groups.filter(g => g.status === 'OPEN' || g.status === 'FULL');
    const withDist = active.map(g => {
      let distance: number | null = null;
      if (position && g.latitude && g.longitude) {
        distance = getDistanceKm(position.lat, position.lng, g.latitude, g.longitude);
      }
      return { ...g, distance };
    });
    const preferredPlayStyles = inferPreferredPlayStyles([
      ...(myGroups?.hosted ?? []),
      ...(myGroups?.joined ?? []),
    ], user?.id);
    return sortGroupsForDisplay(withDist, {
      sortMode: 'recommended',
      preferredPlayStyles,
    }).slice(0, 6);
  }, [groups, myGroups, position, user?.id]);

  const activeCount = groups.filter(g => g.status === 'OPEN').length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HomeNavBar />

      {/* Hero — Mahjong red theme */}
      <section className="relative overflow-hidden bg-[hsl(var(--mahjong-red))]">
        {/* Cross pattern overlay */}
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 14v12M14 20h12' stroke='%23fff' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px',
        }} />
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--mahjong-red))]/80 via-transparent to-black/20 pointer-events-none" />

        <div className="relative px-6 lg:px-20 pt-14 pb-16 md:pt-24 md:pb-28 max-w-7xl mx-auto">
          {/* Tag */}
          <div className="flex items-center gap-3 mb-8 animate-fade-in">
            <div className="h-11 w-11 rounded-lg bg-[hsl(var(--cream))] flex items-center justify-center shadow-md">
              <span className="text-[hsl(var(--mahjong-red))] font-display text-xl font-bold">中</span>
            </div>
            <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-[hsl(var(--cream))] text-sm font-medium border border-white/10">
              同城麻将约局平台
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight text-[hsl(var(--cream))] animate-fade-in mb-6">
            找牌友，就上
            <br />
            <span className="text-[hsl(var(--gold))]">雀友聚</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-[hsl(var(--cream))]/75 max-w-xl leading-relaxed animate-fade-in mb-10">
            基于位置的同城约局平台，透明高效有信用约束。告别"凑人难"，随时随地找到附近的麻将局。
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4 animate-fade-in">
            <Button
              size="lg"
              className="gap-2.5 text-lg px-10 h-14 rounded-full bg-[hsl(var(--cream))] text-[hsl(var(--mahjong-red))] hover:bg-[hsl(var(--cream))]/90 font-bold shadow-lg border-0"
              onClick={() => navigate('/group/create')}
            >
              <Plus className="h-5 w-5" />
              发起拼团
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2.5 text-lg px-10 h-14 rounded-full bg-white/95 border-0 text-[hsl(var(--mahjong-red))]/70 hover:bg-white font-medium shadow-lg"
              onClick={() => navigate('/community')}
            >
              浏览拼团 <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-6 mt-12 pt-8 border-t border-white/10">
            {[
              { value: activeCount > 0 ? `${activeCount}` : '—', label: '招募中' },
              { value: '100', label: '信用初始分' },
              { value: 'LBS', label: '距离匹配' },
            ].map(s => (
              <div key={s.label} className="text-center min-w-[80px]">
                <div className="text-2xl md:text-3xl font-black text-[hsl(var(--cream))]">{s.value}</div>
                <div className="text-xs text-[hsl(var(--cream))]/50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 lg:px-20 py-12 md:py-16 border-y border-border/50 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-10">三步开局，简单高效</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Navigation, title: '附近发现', desc: '打开定位，自动匹配周边拼团', gradient: 'from-primary/15 to-primary/5' },
              { step: '02', icon: UserPlus, title: '一键加入', desc: '选择合适的局，申请加入即可', gradient: 'from-[hsl(var(--gold))]/15 to-[hsl(var(--gold))]/5' },
              { step: '03', icon: Star, title: '互评信用', desc: '牌局结束后互评，积累信用分', gradient: 'from-[hsl(var(--info))]/15 to-[hsl(var(--info))]/5' },
            ].map((f, i) => (
              <div key={f.step} className="relative group animate-fade-in" style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}>
                <div className={cn('p-6 rounded-2xl bg-gradient-to-br border border-border/40 transition-all group-hover:shadow-md group-hover:-translate-y-1', f.gradient)}>
                  <div className="text-4xl font-black text-primary/15 mb-3">{f.step}</div>
                  <div className="h-10 w-10 rounded-lg bg-card flex items-center justify-center mb-3 shadow-sm">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-base mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nearby Groups Preview */}
      <section className="px-6 lg:px-20 py-12 md:py-16 flex-1">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold">附近对局</h2>
              <Badge variant="secondary" className="text-sm font-medium">{currentCity.name}</Badge>
            </div>
            <Button variant="ghost" className="gap-1 text-primary font-medium" onClick={() => navigate('/community')}>
              查看更多 <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <LoadingState />
          ) : previewGroups.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🀄</div>
              <p className="text-lg text-muted-foreground mb-2">当前城市暂无拼团</p>
              <p className="text-sm text-muted-foreground mb-6">成为第一个发起牌局的人吧！</p>
              <Button className="rounded-full px-8 shadow-mahjong" size="lg" onClick={() => navigate('/group/create')}>
                <Plus className="h-5 w-5 mr-2" /> 自己发起一局
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {previewGroups.map((group, i) => {
                const host = group.host;
                const isFull = group.needed_slots === 0 || group.status === 'FULL';

                return (
                  <Card
                    key={group.id}
                    className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden group/card animate-fade-in"
                    style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                    onClick={() => navigate(`/group/${group.id}`)}
                  >
                    {isFull && (
                      <div className="absolute top-3 -right-8 rotate-45 bg-[hsl(var(--status-full))] text-white text-[10px] font-bold px-8 py-0.5 shadow-sm z-10">
                        已满员
                      </div>
                    )}

                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        {host && (
                          <div className="flex items-center gap-2.5 min-w-0">
                            <UserAvatar nickname={host.nickname || ''} avatar={host.avatar_url || undefined} size="md" />
                            <div className="min-w-0">
                              <span className="font-semibold text-sm truncate block">{host.nickname}</span>
                              <CreditBadge score={host.credit_score} />
                            </div>
                          </div>
                        )}
                        <div className="text-right shrink-0">
                          <div className={cn(
                            'text-2xl font-black leading-none transition-transform group-hover/card:scale-105',
                            isFull ? 'text-[hsl(var(--status-full))]' : 'text-primary'
                          )}>
                            缺{group.needed_slots}人
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">总共{group.total_slots}人</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{formatSmartTime(group.start_time)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{group.address}</span>
                        {group.distance !== null && (
                          <span className="shrink-0 text-xs text-primary font-medium ml-auto">
                            {formatDistance(group.distance)}
                          </span>
                        )}
                      </div>

                      {(group.play_style || group.game_note) && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                          {group.play_style && (
                            <span className="px-2.5 py-1 rounded-full text-xs bg-primary/8 text-primary font-medium">
                              {group.play_style}
                            </span>
                          )}
                          {group.game_note?.split(/[，,、\s]+/).filter(Boolean).slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-full text-xs bg-muted/70 text-foreground font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {previewGroups.length > 0 && (
            <div className="text-center mt-12">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-12 gap-2 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => navigate('/community')}
              >
                查看全部拼团 <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-20 py-16 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-10 md:p-14 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-[hsl(var(--gold))]/10 border border-primary/10">
            <div className="text-5xl mb-4">🀄</div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">没有找到合适的局？</h2>
            <p className="text-muted-foreground mb-8">自己发起一局，等牌友来凑桌！</p>
            <Button
              size="lg"
              className="rounded-full px-12 h-14 text-lg font-bold gap-2 shadow-mahjong hover:shadow-lg transition-all"
              onClick={() => navigate('/group/create')}
            >
              <Plus className="h-5 w-5" />
              自己发起一局
            </Button>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}
