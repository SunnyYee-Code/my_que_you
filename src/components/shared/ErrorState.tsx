import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export default function ErrorState({ title = '出错了', description = '请稍后重试', onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {onRetry && <Button variant="outline" onClick={onRetry}>重试</Button>}
    </div>
  );
}
