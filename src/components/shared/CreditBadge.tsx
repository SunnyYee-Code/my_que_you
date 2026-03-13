import { cn } from '@/lib/utils';

export default function CreditBadge({ score, className }: { score: number; className?: string }) {
  const color = score >= 80 ? 'bg-success/15 text-success' : score >= 60 ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', color, className)}>
      信用 {score}
    </span>
  );
}
