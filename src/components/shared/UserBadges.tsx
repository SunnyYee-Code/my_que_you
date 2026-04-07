import { cn } from '@/lib/utils';
import type { EarnedBadge } from '@/lib/credit-badges';
import BadgeDisplay from './BadgeDisplay';

interface UserBadgesProps {
  badges: EarnedBadge[];
  variant?: 'compact' | 'full';
  /** compact 模式下最多展示数量，默认 3 */
  maxDisplay?: number;
  className?: string;
}

export default function UserBadges({
  badges,
  variant = 'compact',
  maxDisplay = 3,
  className,
}: UserBadgesProps) {
  if (badges.length === 0) {
    if (variant === 'full') {
      return <p className="text-sm text-muted-foreground">暂无勋章</p>;
    }
    return null;
  }

  if (variant === 'full') {
    return (
      <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2', className)}>
        {badges.map(badge => (
          <BadgeDisplay key={badge.id} badge={badge} variant="full" />
        ))}
      </div>
    );
  }

  const displayed = badges.slice(0, maxDisplay);
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {displayed.map(badge => (
        <BadgeDisplay key={badge.id} badge={badge} variant="compact" />
      ))}
    </div>
  );
}
