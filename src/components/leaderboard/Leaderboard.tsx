import { useState } from 'react';
import { Trophy, Medal, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/shared/UserAvatar';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { useLeaderboard, type LeaderboardPeriod } from '@/hooks/useLeaderboard';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const MEDAL_COLORS = ['text-[hsl(var(--gold))]', 'text-slate-400', 'text-amber-600'];
const RANK_BG = ['bg-[hsl(var(--gold)/0.12)]', 'bg-slate-100/60', 'bg-amber-50/60'];

function RankIcon({ rank }: { rank: number }) {
  if (rank <= 3) {
    return <Medal className={cn('h-5 w-5 shrink-0', MEDAL_COLORS[rank - 1])} />;
  }
  return <span className="w-5 text-center text-sm font-semibold text-muted-foreground">{rank}</span>;
}

function LeaderboardList({ period }: { period: LeaderboardPeriod }) {
  const { data: entries = [], isLoading } = useLeaderboard(period);
  const navigate = useNavigate();

  if (isLoading) return <LoadingState />;
  if (entries.length === 0) {
    return (
      <EmptyState
        title="暂无数据"
        description={period === 'weekly' ? '本周还没有参与记录' : '本月还没有参与记录'}
      />
    );
  }

  return (
    <div className="space-y-2">
      {entries.slice(0, 50).map(entry => (
        <div
          key={entry.userId}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-muted/60',
            entry.rank <= 3 && RANK_BG[entry.rank - 1],
          )}
          onClick={() => navigate(`/profile/${entry.userId}`)}
        >
          <RankIcon rank={entry.rank} />
          <UserAvatar
            nickname={entry.nickname}
            avatar={entry.avatarUrl || undefined}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{entry.nickname}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-lg font-bold text-primary">{entry.participationCount}</span>
            <span className="text-xs text-muted-foreground ml-0.5">局</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('monthly');

  return (
    <div className="space-y-4">
      {/* 榜单规则说明 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-primary">榜单说明</p>
              <p className="text-xs text-muted-foreground">
                活跃度榜统计用户在周期内参与拼局的场次，数据来源于系统记录，不接受手动申报。
                榜单每次打开时刷新，展示前 50 名活跃雀友。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 榜单主体 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[hsl(var(--gold))]" />
            活跃度榜
            <Badge variant="outline" className="ml-auto text-xs font-normal">近期参与局数</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs value={period} onValueChange={v => setPeriod(v as LeaderboardPeriod)}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="weekly" className="flex-1">周榜</TabsTrigger>
              <TabsTrigger value="monthly" className="flex-1">月榜</TabsTrigger>
            </TabsList>
            <TabsContent value="weekly">
              <LeaderboardList period="weekly" />
            </TabsContent>
            <TabsContent value="monthly">
              <LeaderboardList period="monthly" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
