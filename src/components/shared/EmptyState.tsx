import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        {icon || <Inbox className="h-8 w-8 text-muted-foreground" />}
      </div>
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-2">{actionLabel}</Button>
      )}
    </div>
  );
}
