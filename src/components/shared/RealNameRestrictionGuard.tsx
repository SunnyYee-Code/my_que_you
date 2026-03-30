import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getRealNameRestrictionHint,
  shouldBlockByRestrictionLevel,
  type RealNameVerificationSnapshot,
} from '@/lib/real-name-verification';

type Props = {
  snapshot: RealNameVerificationSnapshot;
  scene: string;
};

export default function RealNameRestrictionGuard({ snapshot, scene }: Props) {
  const navigate = useNavigate();
  const hint = getRealNameRestrictionHint(snapshot, scene);

  if (!hint) return null;

  const isBlocked = shouldBlockByRestrictionLevel(snapshot.restriction_level);

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldAlert className="h-4 w-4 text-warning" />
            实名限制提示
          </div>
          <p className="text-sm text-muted-foreground">{hint}</p>
          <p className="text-xs text-muted-foreground">
            限制级别：{snapshot.restriction_level}{isBlocked ? '（当前不可继续）' : '（当前仅提示）'}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => navigate('/settings?tab=real-name')}>
          前往实名认证
        </Button>
      </CardContent>
    </Card>
  );
}
