import { cn } from '@/lib/utils';

type GroupStatus = 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const statusConfig: Record<GroupStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  OPEN: {
    label: '招募中',
    bg: 'bg-[hsl(var(--status-open)/0.12)]',
    text: 'text-[hsl(var(--status-open))]',
    border: 'border-[hsl(var(--status-open)/0.35)]',
    dot: 'bg-[hsl(var(--status-open))] animate-pulse',
  },
  FULL: {
    label: '已满员',
    bg: 'bg-[hsl(var(--status-full)/0.12)]',
    text: 'text-[hsl(var(--status-full))]',
    border: 'border-[hsl(var(--status-full)/0.35)]',
    dot: 'bg-[hsl(var(--status-full))]',
  },
  IN_PROGRESS: {
    label: '进行中',
    bg: 'bg-[hsl(var(--status-progress)/0.12)]',
    text: 'text-[hsl(var(--status-progress))]',
    border: 'border-[hsl(var(--status-progress)/0.35)]',
    dot: 'bg-[hsl(var(--status-progress))] animate-pulse',
  },
  COMPLETED: {
    label: '已结束',
    bg: 'bg-[hsl(var(--status-completed)/0.10)]',
    text: 'text-[hsl(var(--status-completed))]',
    border: 'border-[hsl(var(--status-completed)/0.25)]',
    dot: 'bg-[hsl(var(--status-completed))]',
  },
  CANCELLED: {
    label: '已失效',
    bg: 'bg-[hsl(var(--status-cancelled)/0.10)]',
    text: 'text-[hsl(var(--status-cancelled))]',
    border: 'border-[hsl(var(--status-cancelled)/0.30)]',
    dot: 'bg-[hsl(var(--status-cancelled))]',
  },
};

export default function StatusBadge({ status, className: extraClass }: { status: GroupStatus; className?: string }) {
  const config = statusConfig[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      config.bg,
      config.text,
      config.border,
      extraClass
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dot)} />
      {config.label}
    </span>
  );
}
