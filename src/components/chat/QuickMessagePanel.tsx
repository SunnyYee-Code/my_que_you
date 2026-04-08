// T16 4.4.2 到场辅助链路 — 快捷协同消息面板
import { Button } from '@/components/ui/button';
import { QuickMessage } from '@/lib/arrival-assist';
import { cn } from '@/lib/utils';

interface QuickMessagePanelProps {
  messages: QuickMessage[];
  onSelect: (content: string) => void;
  className?: string;
}

export default function QuickMessagePanel({ messages, onSelect, className }: QuickMessagePanelProps) {
  if (messages.length === 0) return null;

  return (
    <div className={cn('px-3 py-2 border-t bg-muted/30', className)}>
      <p className="text-[10px] text-muted-foreground mb-1.5">快捷协同</p>
      <div className="flex flex-wrap gap-1.5">
        {messages.map(msg => (
          <Button
            key={msg.id}
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5 rounded-full"
            onClick={() => onSelect(msg.content)}
          >
            {msg.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
