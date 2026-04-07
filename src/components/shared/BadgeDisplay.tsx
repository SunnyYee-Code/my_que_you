import { cn } from '@/lib/utils';
import type { EarnedBadge } from '@/lib/credit-badges';

interface BadgeDisplayProps {
  badge: EarnedBadge;
  /** compact: 小标签（用于列表）| full: 完整卡片（用于资料页） */
  variant?: 'compact' | 'full';
  className?: string;
}

export default function BadgeDisplay({ badge, variant = 'compact', className }: BadgeDisplayProps) {
  if (variant === 'full') {
    return (
      <div
        className={cn(
          'flex items-start gap-2.5 rounded-xl border px-3 py-2.5',
          badge.level === 'gold' && 'border-[hsl(var(--gold)/0.4)] shadow-sm',
          badge.level === 'silver' && 'border-slate-300',
          badge.level === 'bronze' && 'border-amber-700/30',
          className,
        )}
      >
        <span className="text-xl leading-none mt-0.5">{badge.icon}</span>
        <div className="min-w-0">
          <span className={cn('text-xs font-semibold', badge.colorClass.split(' ')[1])}>
            {badge.label}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{badge.description}</p>
        </div>
      </div>
    );
  }

  return (
    <span
      title={`${badge.label}：${badge.description}`}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
        badge.colorClass,
        badge.level === 'gold' && 'ring-1 ring-[hsl(var(--gold)/0.5)]',
        badge.level === 'silver' && 'ring-1 ring-slate-400/40',
        className,
      )}
    >
      <span className="text-[10px] leading-none">{badge.icon}</span>
      {badge.shortLabel}
    </span>
  );
}
